const EventEmitter = require('eventemitter3')
const opentracing = require('opentracing')
const parseEvent = require('../utils/parseEvent')
const waterfall = require('../utils/asyncWaterfall')
const serializeData = require('../utils/serializeData')
const handlerWrapper = require('../utils/handlerWrapper')
const throwAsException = require('../utils/throwAsException')
const { WaitGroup } = require('@jpwilliams/waitgroup')
const states = require('../utils/states')

class Endpoint {
  constructor (remit, opts, ...handlers) {
    this._remit = remit
    this._emitter = new EventEmitter()
    this._wg = new WaitGroup()
    this._state = states.STOPPED

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
  async start () {
    switch (this._state) {
      // case states.STOPPED:
      case states.STOPPING:
        throw new Error('Trying to start an endpoint which is currently stopping')

      case states.CONSUMING:
        return this

      case states.SETTINGUP:
        return this._settingUp

      case states.PAUSING:
        throw new Error('Trying to start an endpoint which is currently pausing')

      case states.PAUSED:
        return this.resume()

      case states.RESUMING:
        return this._resuming
    }

    if (!this._handler) {
      throw new Error('Trying to boot endpoint with no handler')
    }

    this._settingUp = this._setup(this._options)

    return this._settingUp
  }

  async pause (cold) {
    switch (this._state) {
      case states.STOPPED:
        return this

      case states.STOPPING:
        return this._stopping

      // case states.STARTED:
      case states.STARTING:
        throw new Error('Trying to pause an endpoint which is currently starting')

      case states.PAUSING:
        return this._pausing

      case states.PAUSED:
        return this

      case states.RESUMING:
        throw new Error('Trying to pause an endpoint which is currently resuming')
    }

    this._pausing = new Promise((resolve, reject) => {
      this._state = states.PAUSING
      const ops = [this._consumer.cancel(this._consumerTag)]

      if (cold) {
        // cold pause requsted, so let's push all messages
        // back in to the queue rather than handling them
        this._cold = true
        ops.push(this._consumer.recover())
      }

      return Promise.all(ops)
        .then(() => {
          this._state = states.PAUSED
          resolve(this)
        })
        .catch((e) => {
          this._state = states.STOPPED
          reject(e)
        })
    })

    return this._pausing
  }

  async resume () {
    switch (this._state) {
      case states.STOPPED:
        return this.start()

      case states.STOPPING:
        throw new Error('Trying to resume an endpoint which is currently stopping')

      case states.CONSUMING:
        return this

      case states.SETTINGUP:
        return this._settingUp

      case states.PAUSING:
        throw new Error('Trying to resume an endpoint which is currently pausing')

      // case states.PAUSED:
      case states.RESUMING:
        return this._resuming
    }

    this._resuming = new Promise(async (resolve, reject) => {
      this._state = states.RESUMING
      let consumeResult

      try {
        consumeResult = await this._consumer.consume(
          this._options.queue,
          this._remit._namespace.bind(this._incoming.bind(this)),
          {
            noAck: true,
            exclusive: false
          }
        )
      } catch (e) {
        this._state = states.STOPPED

        return reject(e)
      }

      this._consumerTag = consumeResult.consumerTag
      this._state = states.CONSUMING

      return resolve(this)
    })

    return this._resuming
  }

  async close (cold) {
    switch (this._state) {
      case states.STOPPED:
        return this
      case states.STOPPING:
        return this._stopping

      // case states.CONSUMING:
      case states.SETTINGUP:
        throw new Error('Trying to close an endpoint which is currently setting up')

      case states.PAUSING:
        throw new Error('Trying to close an endpoint which is currently pausing')
      // case states.PAUSED:

      case states.RESUMING:
        throw new Error('Trying to close an endpoint which is currently resuming')
    }

    this._stopped = new Promise(async (resolve, reject) => {
      this._state = states.STOPPING

      try {
        await this.pause(cold)
        if (!cold) await this._wg.wait()
        await this._consumer.close()

        return resolve(this)
      } catch (e) {
        return reject(e)
      } finally {
        this._state = states.STOPPED
      }
    })

    return this._stopped
  }

  async _incoming (message) {
    if (!message) {
      await throwAsException(new Error('Consumer cancelled unexpectedly; this was most probably done via RabbitMQ\'s management panel'))
	  }

	  this._wg.add(1)

    try {
      var data = JSON.parse(message.content.toString())
    } catch (e) {
      // if this fails, there's no need to nack,
	    // so just ignore it
      this._wg.done()

      return
    }

    const parentContext = this._remit._tracer.extract(opentracing.FORMAT_TEXT_MAP, (message.properties.headers && message.properties.headers.context) || {}) || null

    const span = this._remit._tracer.startSpan(`Remit Endpoint: ${this._options.event}`, {
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

    this._remit._namespace.set('context', span.context())

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

      this._wg.done()
    }
  }

  async _setup ({ queue, event, prefetch = 48 }) {
    this._state = states.SETTINGUP

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
        if (this._state !== states.STOPPING) {
          throwAsException(new Error('Consumer died - this is most likely due to the RabbitMQ connection dying'))
        }
      })

      if (prefetch > 0) {
        this._consumer.prefetch(prefetch, true)
      }

      await this._consumer.bindQueue(
        queue,
        this._remit._exchange,
        event
      )

      this._state = states.PAUSED

      await this.resume()

      return this
    } catch (e) {
      this._state = states.STOPPED

      await throwAsException(e)
    }
  }
}

module.exports = Endpoint
