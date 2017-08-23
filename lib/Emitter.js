const CallableInstance = require('callable-instance')
const EventEmitter = require('eventemitter3')
const genUuid = require('../utils/genUuid')
const parseEvent = require('../utils/parseEvent')
const getStackLine = require('../utils/getStackLine')

class Emitter extends CallableInstance {
  constructor (remit, opts = {}) {
    super('send')

    this._remit = remit
    this._emitter = new EventEmitter()

    let parsedOpts = {}

    if (typeof opts === 'string') {
      parsedOpts.event = opts
    } else {
      parsedOpts = opts
    }

    if (!parsedOpts.event) {
      throw new Error('No/invalid event specified when creating an emission')
    }

    this.options(parsedOpts)

    this._ready = Promise.resolve(this)
  }

  on (...args) {
    // should we warn/block users when they try
    // to listen to an event that doesn't exist?
    this._emitter.on(...args)

    return this
  }

  options (opts = {}) {
    this._options = this._generateOptions(opts)

    return this
  }

  ready () {
    return this._ready
  }

  async send (data = null, opts = {}) {
    // parse the callsites here, as after the `await`
    // we'll get a different stack
    const callsites = getStackLine.capture()
    const now = new Date().getTime()
    const parsedOptions = this._generateOptions(opts)

    const messageId = genUuid()

    const message = {
      mandatory: false,
      messageId: messageId,
      appId: this._remit._options.name,
      timestamp: now,
      headers: {
        trace: getStackLine.parse(callsites)
      }
    }

    if (isFinite(parsedOptions.priority) && parsedOptions.priority >= 0 && parsedOptions.priority <= 255) {
      message.priority = parsedOptions.priority
    } else if (parsedOptions.priority !== undefined) {
      throw new Error(`Invalid priority "${parsedOptions.priority}" when making request`)
    }

    let parsedData

    // coerce data to `null` if undefined or an unparsable pure JS property.
    parsedData = JSON.stringify(data)

    if (typeof parsedData === 'undefined') {
      console.warn('[WARN] Remit request sent with unparsable JSON; this could be a function or an undefined variable. Data instead set to NULL.')

      // string here coerces to actual NULL once JSON.parse is performed
      parsedData = 'null'
    }

    const demitQueue = await this._setupDemitQueue(parsedOptions, now)
    const worker = await this._remit._workers.acquire()

    try {
      if (demitQueue) {
        const { queue, expiration } = demitQueue

        if (parsedOptions.schedule) {
          message.headers.scheduled = +parsedOptions.schedule
          message.expiration = expiration
        } else {
          message.headers.delay = parsedOptions.delay
        }

        worker.sendToQueue(
          queue,
          Buffer.from(parsedData),
          message
        )
      } else {
        worker.publish(
          this._remit._exchange,
          parsedOptions.event,
          Buffer.from(parsedData),
          message
        )
      }

      this._remit._workers.release(worker)

      // We do this to make room for multiple emits.
      // without this, continued synchronous emissions
      // never get a chance to send
      await new Promise(resolve => setImmediate(resolve))

      const event = parseEvent(message, {
        routingKey: parsedOptions.event
      }, JSON.parse(parsedData), true)

      this._emitter.emit('sent', event)

      return event
    } catch (e) {
      this._remit._workers.destroy(worker)
      throw e
    }
  }

  _generateOptions (opts = {}) {
    return Object.assign({}, this._options || {}, opts)
  }

  async _setupDemitQueue (opts, time) {
    if (isNaN(opts.delay) && !opts.schedule) {
      return false
    }

    if (
      (!opts.delay || isNaN(opts.delay)) &&
      (!opts.schedule || !(opts.schedule instanceof Date) || opts.schedule.toString() === 'Invalid Date')
    ) {
      throw new Error('Invalid schedule date or delay duration when attempting to send a delayed emission')
    }

    const group = opts.schedule ? +opts.schedule : opts.delay
    const expiration = opts.schedule ? (+opts.schedule - time) : opts.delay

    if (expiration < 1) {
      return false
    }

    const queueOpts = {
      exclusive: false,
      durable: true,
      autoDelete: true,
      deadLetterExchange: this._remit._exchange,
      deadLetterRoutingKey: opts.event
    }

    if (opts.delay) {
      queueOpts.messageTtl = expiration
      queueOpts.expires = expiration * 2
    } else {
      queueOpts.expires = expiration + 60000
    }

    const worker = await this._remit._workers.acquire()
    const queue = `d:${this._remit._exchange}:${opts.event}:${group}`

    try {
      await worker.assertQueue(queue, queueOpts)
      this._remit._workers.release(worker)
      return { queue, expiration }
    } catch (e) {
      this._remit._workers.destroy(worker)

      // if we're scheduling an emission and we have an inequivalent
      // x-expires argument, that's fine; that'll happen
      if (opts.schedule && e.message && e.message.substr(94, 28) === 'inequivalent arg \'x-expires\'') {
        return { queue, expiration }
      } else {
        throw e
      }
    }
  }
}

module.exports = Emitter
