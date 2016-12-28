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

  return responseType
}

function Response (base, type, options) {
  const remit = this

  let response = {
    _emitter: new EventEmitter()
  }

  response.ready = function onReady (callback) {
    response._emitter.once('ready', callback)

    return response
  }

  response.data = function onData (callback) {
    response._emitter.on('data', callback)

    return response
  }

  getWorkChannel().then((workChannel) => {
    debug('Asserting endpoint', options.event)

    return workChannel.assertQueue(options.event, {
      exclusive: false,
      durable: true,
      autoDelete: false
    })
  }).then((queueData) => {
    return getConsumeChannel()
  }).then((consumeChannel) => {
    debug('Binding event')

    return consumeChannel.bindQueue(
      options.event,
      remit._options.exchange,
      options.event
    )
  }).then(() => {
    return getConsumeChannel()
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
    response._emitter.emit('ready')
  }).catch((err) => {
    console.trace('Threw error here unexpectedly', err)
  })

  return response
}

module.exports = ResponseType
