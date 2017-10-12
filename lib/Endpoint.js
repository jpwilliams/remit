const EventEmitter = require('eventemitter3')
const parseEvent = require('../utils/parseEvent')
const waterfall = require('../utils/asyncWaterfall')
const serializeData = require('../utils/serializeData')
const handlerWrapper = require('../utils/handlerWrapper')
const throwAsException = require('../utils/throwAsException')

class Endpoint {
  constructor (remit, opts, ...handlers) {
    this._remit = remit
    this._emitter = new EventEmitter()

    let parsedOpts = {}

    if (typeof opts === 'string') {
      parsedOpts.event = opts
    } else {
      parsedOpts = opts || {}
    }

    if (!parsedOpts.event) {
      throw new Error('No/invalid event specified when creating an endpoint')
    }

    this.options(parsedOpts)

    if (handlers.length) {
      this.handler(...handlers)
    }
  }

  handler (...fns) {
    if (!fns.length) {
      throw new Error('No handler(s) given when trying to set endpoint handler(s)')
    }

    this._handler = waterfall(...fns.map(handlerWrapper))

    return this
  }

  on (...args) {
    // should we warn/block users when they try
    // to listen to an event that doesn't exist?
    this._emitter.on(...args)

    return this
  }

  options (opts = {}) {
    opts.queue = opts.queue || opts.event || this._options.queue || this._options.event
    this._options = Object.assign({}, this._options || {}, opts)

    return this
  }

  // TODO should we emit something once booted?
  start () {
    if (this._started) {
      return this._started
    }

    if (!this._handler) {
      throw new Error('Trying to boot endpoint with no handler')
    }

    this._started = this._setup(this._options)

    return this._started
  }

  async _incoming (message) {
    if (!message) {
      throwAsException(new Error('Consumer cancelled unexpectedly; this was most probably done via RabbitMQ\'s management panel'))
    }

    try {
      var data = JSON.parse(message.content.toString())
    } catch (e) {
      // if this fails, there's no need to nack,
      // so just ignore it
      return
    }

    const event = parseEvent(message.properties, message.fields, data)
    const resultOp = this._handler(event)

    try {
      this._emitter.emit('data', event)
    } catch (e) {
      console.error(e)
    }

    const canReply = Boolean(message.properties.replyTo)

    if (!canReply) {
      await resultOp
    } else {
      let finalData = await resultOp
      finalData = serializeData(finalData)

      const worker = await this
        ._remit
        ._workers
        .acquire()

      try {
        await worker.sendToQueue(
          message.properties.replyTo,
          Buffer.from(finalData),
          message.properties
        )

        this._remit._workers.release(worker)
      } catch (e) {
        this._remit._workers.destroy(worker)
      }
    }
  }

  async _setup ({ queue, event, prefetch = 48 }) {
    try {
      const worker = await this._remit._workers.acquire()

      try {
        await worker.assertQueue(queue, {
          exclusive: false,
          durable: true,
          autoDelete: false,
          maxPriority: 10
        })

        this._remit._workers.release(worker)
      } catch (e) {
        this._remit._workers.destroy(worker)
        throw e
      }

      const connection = await this._remit._connection
      this._consumer = await connection.createChannel()
      this._consumer.on('error', console.error)
      this._consumer.on('close', () => {
        throwAsException(new Error('Consumer died - this is most likely due to the RabbitMQ connection dying'))
      })

      if (prefetch > 0) {
        this._consumer.prefetch(prefetch, true)
      }

      await this._consumer.bindQueue(
        queue,
        this._remit._exchange,
        event
      )

      await this._consumer.consume(
        queue,
        this._incoming.bind(this),
        {
          noAck: true,
          exclusive: false
        }
      )

      return this
    } catch (e) {
      throwAsException(e)
    }
  }
}

module.exports = Endpoint
