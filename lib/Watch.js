const EventEmitter = require('eventemitter3')
const { ulid } = require('ulid')
const bubble = require('../utils/bubble')
const waterfall = require('../utils/asyncWaterfall')
const parseEvent = require('../utils/parseEvent')
const handlerWrapper = require('../utils/handlerWrapper')
const throwAsException = require('../utils/throwAsException')

class Watch {
  constructor (remit, event, ...handlers) {
    this._remit = remit
    this._emitter = new EventEmitter()
    this._state = undefined

    if (!event) {
      throw new Error('No event specified when creating a watcher')
    }

    this.options({ event })

    if (handlers.length) {
      this.handler(...handlers)
    }
  }

  get state () {
    return this._state
  }

  handler (...fns) {
    this._handler = waterfall(...fns.map(handlerWrapper))

    return this
  }

  on (...args) {
    this._emitter.on(...args)

    return this
  }

  options (opts = {}) {
    if (!this._options) this._options = {}
    this._options.event = opts.event || this._options.event
    this._options.queue = `remit::data::${this._options.event}`

    return this
  }

  start () {
    if (this._started) {
      return this._started
    }

    if (!this._handler) {
      throw new Error('Trying to boot watcher with no handler')
    }

    this._started = this._setup(this._options)

    return this._started
  }

  async _incoming (message, ack) {
    if (!message) {
      await throwAsException(new Error('Consumer cancelled unexpectedly; this was most probably done via RabbitMQ\'s management panel'))
    }

    try {
      var data = JSON.parse(message.content.toString())
    } catch (e) {
      console.error(e)
      if (ack) this._consumer.nack(message, false, true)

      return
    }

    console.log('wowoowow')

    this._state = data

    if (message.properties.headers) {
      bubble.set('originId', message.properties.headers.originId)
      if (!bubble.get('bubbleId')) bubble.set('bubbleId', ulid())
    }

    const event = parseEvent(message.properties, message.fields, data, {
      flowType: 'entry',
      isReceiver: true
    })

    this._handler(event)

    try {
      this._emitter.emit('data', event)
    } catch (e) {
      console.error(e)
    }
  }

  async _setup ({ queue, event }) {
    this._starting = true
    let consumerQueue

    try {
      const worker = await this._remit._workers.acquire()

      try {
        await Promise.all([
          worker.assertQueue(queue, {
            exclusive: false,
            durable: true,
            autoDelete: false,
            maxLength: 1
          }).then(() => worker.bindQueue(
            queue,
            this._remit._exchange,
            event
          )),

          worker.assertQueue('', {
            exclusive: true,
            durable: false,
            autoDelete: true,
            maxLength: 1
          }).then(({ queue }) => {
            consumerQueue = queue

            return worker.bindQueue(
            consumerQueue,
            this._remit._exchange,
            event
            )
          })
        ])
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

      const boundRun = bubble.bind(this._incoming.bind(this))

      await this._consumer.consume(
        consumerQueue,
        boundRun,
        {
          noAck: true,
          exclusive: true
        }
      )

      const msg = await this._consumer.get(queue)
      if (msg) boundRun(msg)

      delete this._starting

      return this
    } catch (e) {
      delete this._starting
      await throwAsException(e)
    }
  }
}

module.exports = Watch
