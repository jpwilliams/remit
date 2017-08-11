const CallableInstance = require('callable-instance')
const EventEmitter = require('eventemitter3')
const genUuid = require('../utils/genUuid')
const parseEvent = require('../utils/parseEvent')

class Request extends CallableInstance {
  constructor (remit, opts = {}) {
    super('send')

    this._remit = remit
    this._emitter = new EventEmitter()
    this._timers = {}

    let parsedOpts = {}

    if (typeof opts === 'string') {
      parsedOpts.event = opts
    } else {
      parsedOpts = opts
    }

    if (!parsedOpts.event) {
      throw new Error('No/invalid event specified when creating a request')
    }

    this.options(parsedOpts)

    this._ready = this._setup(this._options)
  }

  on (...args) {
    // should we warn/block users when they try
    // to listen to an event that doesn't exist?
    this._emitter.on(...args)

    return this
  }

  // TODO pass back fallback if it's anything but undefined
  fallback (data) {
    this._fallback = data

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
    await this._ready
    const now = new Date().getTime()
    const parsedOptions = this._generateOptions(opts)

    const messageId = genUuid()

    const message = {
      mandatory: false,
      messageId: messageId,
      appId: this._remit._options.name,
      timestamp: now,
      headers: {},
      correlationId: messageId,
      replyTo: 'amq.rabbitmq.reply-to'
    }

    if (parsedOptions.priority) {
      if (parsedOptions.priority > 10 || parsedOptions.priority < 0) {
        throw new Error(`Invalid priority "${parsedOptions.priority}" when making request`)
      }

      message.priority = parsedOptions.priority
    }

    let parsedData
    let eventData = data

    // coerce data to `null` if undefined or an unparsable pure JS property.
    parsedData = JSON.stringify(data)

    if (typeof parsedData === 'undefined') {
      console.warn('[WARN] Remit request sent with unparsable JSON; this could be a function or an undefined variable')

      // string here coerces to actual NULL once JSON.parse is performed
      parsedData = 'null'
      eventData = null
    }

    const event = parseEvent(message, {
      routingKey: parsedOptions.event
    }, eventData)

    this._channel.publish(
      this._remit._exchange,
      parsedOptions.event,
      Buffer.from(parsedData),
      message
    )

    this._emitter.emit('sent', event)

    let timeout = 30000
    let givenTimeout = Number(parsedOptions.timeout)
    if (!isNaN(givenTimeout)) timeout = givenTimeout

    if (timeout) {
      this._setTimer(messageId, timeout)
    }

    return this._waitForResult(messageId)
  }

  _generateOptions (opts = {}) {
    return Object.assign({}, this._options || {}, opts)
  }

  async _incoming (message) {
    try {
      var content = JSON.parse(message.content.toString())
    } catch (e) {
      console.error(e)
    }

    this._emitter.emit(`data-${message.properties.messageId}`, ...content)
  }

  _setTimer (messageId, time) {
    this._timers[messageId] = setTimeout(() => {
      this._emitter.emit(`timeout-${messageId}`, 'TIMEDOUTMATE')
    }, time)
  }

  async _setup (opts = {}) {
    const connection = await this._remit._connection
    this._channel = await connection.createChannel()

    await this._channel.consume(
      'amq.rabbitmq.reply-to',
      this._incoming.bind(this),
      {
        noAck: true,
        exclusive: true
      }
    )

    return this
  }

  _waitForResult (messageId) {
    return new Promise((resolve, reject) => {
      const cleanUp = (err, result) => {
        clearTimeout(this._timers[messageId])
        delete this._timers[messageId]

        this._emitter.removeAllListeners(`data-${messageId}`)
        this._emitter.removeAllListeners(`timeout-${messageId}`)

        if (err) {
          this._emitter.emit('error', err)

          if (this._fallback) {
            resolve(this._fallback)
          } else {
            reject(err)
          }
        } else {
          resolve(result)
          this._emitter.emit('success', result)
        }
      }

      this._emitter.once(`data-${messageId}`, cleanUp)

      this._emitter.once(`data-${messageId}`, (...args) => {
        this._emitter.emit('data', ...args)
      })

      this._emitter.once(`timeout-${messageId}`, cleanUp)

      this._emitter.once(`timeout-${messageId}`, (...args) => {
        this._emitter.emit('timeout', ...args)
      })
    })
  }
}

module.exports = Request
