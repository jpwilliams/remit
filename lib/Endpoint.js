const EventEmitter = require('eventemitter3')
const opentracing = require('opentracing')
const bubble = require('../utils/bubble')
const { ulid } = require('ulid')
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

  pause (cold) {
    if (!this._started) {
      return Promise.resolve(this)
    }

    if (this._paused) {
      if (this._resuming) {
        console.warn('Tried to pause endpoint whilst busy resuming')
      }

      return this._paused
    }

    this._paused = new Promise((resolve, reject) => {
      const ops = [this._consumer.cancel(this._consumerTag)]

      if (cold) {
        // cold pause requsted, so let's push all messages
        // back in to the queue rather than handling them
        this._cold = true
        ops.push(this._consumer.recover())
      }

      return Promise.all(ops)
        .then(() => resolve(this))
        .catch(reject)
    })

    return this._paused
  }

  resume () {
    if (this._resuming) return this._resuming
    if (!this._started) return this.start()
    if (!this._starting && !this._paused) return Promise.resolve(this)

    this._resuming = new Promise(async (resolve, reject) => {
      let consumeResult

      try {
        consumeResult = await this._consumer.consume(
          this._options.queue,
          bubble.bind(this._incoming.bind(this)),
          {
            noAck: true,
            exclusive: false
          }
        )
      } catch (e) {
        delete this._resuming

        return reject(e)
      }

      this._consumerTag = consumeResult.consumerTag
      delete this._resuming
      delete this._paused
      delete this._cold

      return resolve(this)
    })

    return this._resuming
  }

  async _incoming (message) {
    if (!message) {
      await throwAsException(new Error('Consumer cancelled unexpectedly; this was most probably done via RabbitMQ\'s management panel'))
    }

    try {
      var data = JSON.parse(message.content.toString())
    } catch (e) {
      // if this fails, there's no need to nack,
      // so just ignore it
      return
    }

    const parentContext = this._remit._tracer.extract(opentracing.FORMAT_TEXT_MAP, (message.properties.headers && message.properties.headers.context) || {}) || null

    const span = this._remit._tracer.startSpan(`${this._options.event} (endpoint)`, {
      tags: {
        'remit.version': this._remit.version,
        [opentracing.Tags.SAMPLING_PRIORITY]: 1,
        [opentracing.Tags.COMPONENT]: 'remit',
        [opentracing.Tags.MESSAGE_BUS_DESTINATION]: this._options.event,
        [opentracing.Tags.SPAN_KIND]: opentracing.Tags.SPAN_KIND_RPC_SERVER,
        'data.incoming': data
      },
      childOf: parentContext
    })

    bubble.set('context', span.context())

    const event = parseEvent(message.properties, message.fields, data, {
      isReceiver: true
    })

    const resultOp = this._handler(event)

    try {
      this._emitter.emit('data', event)
    } catch (e) {
      console.error(e)
    }

    const canReply = Boolean(message.properties.replyTo)

    let finalData = await resultOp
    const [ resErr, resData ] = finalData

    if (resErr) {
      span.setTag(opentracing.Tags.ERROR, true)
      span.setTag('data.outgoing', resErr)
    } else {
      span.setTag('data.outgoing', resData)
    }

    span.finish()

    // if a cold pause has been requested, don't process this
    if (this._cold) return

    if (canReply) {
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

        const event = parseEvent(message.properties, {
          routingKey: this._options.event
        }, finalData)

        this._emitter.emit('sent', event)
      } catch (e) {
        this._remit._workers.destroy(worker)
      }
    }
  }

  async _setup ({ queue, event, prefetch = 48 }) {
    this._starting = true

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
        delete this._starting
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

      await this.resume()
      delete this._starting

      return this
    } catch (e) {
      delete this._starting
      await throwAsException(e)
    }
  }
}

module.exports = Endpoint
