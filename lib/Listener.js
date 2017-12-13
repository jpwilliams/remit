const bubble = require('../utils/bubble')
const { ulid } = require('ulid')
const EventEmitter = require('eventemitter3')
const parseEvent = require('../utils/parseEvent')
const waterfall = require('../utils/asyncWaterfall')
const handlerWrapper = require('../utils/handlerWrapper')
const throwAsException = require('../utils/throwAsException')

class Listener {
  constructor (remit, opts, ...handlers) {
    this._remit = remit
    this._emitter = new EventEmitter()

    let parsedOpts = {}

    if (typeof opts === 'string') {
      parsedOpts.event = opts
    } else {
      parsedOpts = opts
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
    const event = opts.event || this._options.event
    this._remit._eventCounters[event] = this._remit._eventCounters[event] || 0

    opts.queue = opts.queue || `${opts.event || this._options.event}:l:${this._remit._options.name}:${++this._remit._eventCounters[event]}`

    this._options = Object.assign({}, this._options || {}, opts)

    return this
  }

  start () {
    if (this._started) {
      return this._started
    }

    if (!this._handler) {
      throw new Error('Trying to boot listener with no handler')
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
      // if this fails, let's just nack the message and leave
      this._consumer.nack(message)

      return
    }

    bubble.set('originId', message.properties.headers.originId)
    if (!bubble.get('bubbleId')) bubble.set('bubbleId', ulid())

    const event = parseEvent(message.properties, message.fields, data, false, true, false, 'entry')
    const resultOp = this._handler(event)

    try {
      this._emitter.emit('received', event)
    } catch (e) {
      console.error(e)
    }

    await resultOp
    this._consumer.ack(message)
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
        bubble.bind(this._incoming.bind(this)),
        {
          noAck: false,
          exclusive: false
        }
      )

      return this
    } catch (e) {
      throwAsException(e)
    }
  }
}

module.exports = Listener
