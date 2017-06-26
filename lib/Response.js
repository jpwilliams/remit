const debug = require('debug')('remit:response')
const async = require('async')
const EventEmitter = require('eventemitter3')
const getConsumeChannel = require('./assertions/consumeChannel')
const handleMessage = require('./handleMessage')

function ResponseType (masterOptions) {
  const remit = this

  let responseType = function (event, options) {
    if (!event) {
      throw new Error('No event given')
    }

    options = options || {}
    options.event = event

    if (masterOptions.before) {
      options = masterOptions.before(remit, options)
    }

    if (!options.queue) {
      if (masterOptions.listener) {
        options.queue = `${event}:l:${remit._options.name}:${++remit._internal.listenerCount}`
      } else {
        options.queue = options.event
      }
    }

    return Response.apply(remit, [null, responseType, options])
  }

  responseType._emitter = new EventEmitter()

  responseType.options = {
    shouldAck: !!masterOptions.shouldAck,
    shouldReply: !!masterOptions.shouldReply
  }

  responseType.ready = function onReady (callback) {
    responseType._emitter.on('ready', callback)

    return responseType
  }

  responseType.data = function onData (callback) {
    responseType._emitter.on('data', callback)

    return responseType
  }

  responseType.done = function onDone (callback) {
    responseType._emitter.on('done', callback)

    return responseType
  }

  return responseType
}

function Response (base, type, options) {
  const remit = this

  let response = {
    _emitter: new EventEmitter()
  }

  response.ready = function onReady (callback) {
    if (callback && typeof callback === 'function') {
      response._emitter.once('ready', callback)

      return response
    }

    return new Promise((resolve, reject) => {
      response._emitter.once('ready', resolve)
      response._emitter.once('error', reject)
    })
  }

  response.data = function onData (callbacks) {
    callbacks = Array.isArray(callbacks) ? callbacks : [callbacks]
    const finalCallback = callbacks.pop()

    if (!callbacks.length) {
      response._emitter.on('data', finalCallback)
    } else {
      const run = async.seq(...callbacks)

      response._emitter.on('data', (event, callback) => {
        run(event, (err, event) => {
          if (err) {
            return callback(err)
          }

          finalCallback(event, callback)
        })
      })
    }

    return response
  }

  let workChannel

  remit._workChannelPool.acquire().then((channel) => {
    debug('Asserting endpoint', options.event)

    workChannel = channel

    return workChannel.assertQueue(options.queue, {
      exclusive: false,
      durable: true,
      autoDelete: false,
      maxPriority: 10
    })
  }).then((queueData) => {
    debug('Asserted queue', options.queue)

    remit._workChannelPool.release(workChannel)

    return getConsumeChannel.apply(remit)
  }).then((consumeChannel) => {
    debug('Binding event')

    return consumeChannel.bindQueue(
      options.queue,
      remit._options.exchange,
      options.event
    )
  }).then(() => {
    return getConsumeChannel.apply(remit)
  }).then((consumeChannel) => {
    debug('Consuming messages')

    return consumeChannel.consume(options.queue, (message) => {
      if (!message) {
        return console.trace('Consumer cancelled')
      }

      return handleMessage.apply(remit, [type, response, message])
    }, {
      noAck: !type.options.shouldAck,
      exclusive: false
    })
  }).then(() => {
    type._emitter.emit('ready', options)
    response._emitter.emit('ready', options)
  }).catch((err) => {
    console.trace('Threw error here unexpectedly', err)
    remit._workChannelPool.destroy(workChannel)
  })

  return response
}

module.exports = ResponseType
