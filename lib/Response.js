const debug = require('debug')('remit:response')
const EventEmitter = require('eventemitter3')
const getWorkChannel = require('./assertions/workChannel')
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

  response.data = function onData (callback) {
    response._emitter.on('data', callback)

    return response
  }

  getWorkChannel.apply(remit).then((workChannel) => {
    debug('Asserting endpoint', options.event)

    return workChannel.assertQueue(options.event, {
      exclusive: false,
      durable: true,
      autoDelete: false
    })
  }).then((queueData) => {
    return getConsumeChannel.apply(remit)
  }).then((consumeChannel) => {
    debug('Binding event')

    return consumeChannel.bindQueue(
      options.event,
      remit._options.exchange,
      options.event
    )
  }).then(() => {
    return getConsumeChannel.apply(remit)
  }).then((consumeChannel) => {
    debug('Consuming messages')

    return consumeChannel.consume(options.event, (message) => {
      if (!message) {
        return console.trace('Consumer cancelled')
      }

      return handleMessage.apply(remit, [type, response, message])
    }, {
      noAck: !type.options.shouldAck,
      exclusive: false
    })
  }).then(() => {
    type._emitter.emit('ready')
    response._emitter.emit('ready')
  }).catch((err) => {
    console.trace('Threw error here unexpectedly', err)
  })

  return response
}

module.exports = ResponseType
