const debug = require('debug')('remit:request')
const EventEmitter = require('eventemitter3')
const getPublishChannel = require('./assertions/publishChannel')
const consumeReplies = require('./assertions/reply')
const uuid = require('uuid')

function RequestType (masterOptions) {
  const remit = this

  let requestType = function (event, options) {
    if (!event) {
      throw new Error('No event given')
    }

    options = options || {}
    options.event = event

    return Request.apply(remit, [null, requestType, options])
  }

  requestType._emitter = new EventEmitter()

  requestType.options = {
    expectReply: !!masterOptions.expectReply
  }

  requestType.data = function onData (callback) {
    requestType._emitter.on('data', callback)

    return requestType
  }

  requestType.sent = function onSent (callback) {
    requestType._emitter.on('sent', callback)

    return requestType
  }

  return requestType
}

function Request (base, type, options) {
  const remit = this

  let request = function () {
    const extra = Array.from(arguments)
    const data = extra.shift()
    const now = +new Date()
    let trace

    try {
      const re = /^\s{4}.+?(\/[^/].+?)\)/gm
      const stackTrace = (new Error()).stack.toString()
      re.exec(stackTrace)
      trace = re.exec(stackTrace)[1] || undefined
    } catch (e) {}

    ;(type.options.expectReply ? consumeReplies.apply(remit) : Promise.resolve())
      .then(() => {
        return getPublishChannel.apply(remit)
      }).then((publishChannel) => {
        debug('Sending message...')

        let messageOptions = {
          mandatory: true,
          messageId: uuid.v4(),
          appId: remit._options.name,
          timestamp: now,

          headers: {
            trace: trace
          }
        }

        if (type.options.expectReply) {
          messageOptions.correlationId = messageOptions.messageId
          messageOptions.replyTo = 'amq.rabbitmq.reply-to'

          remit._emitter.once(messageOptions.correlationId, (message) => {
            let messageContent

            try {
              messageContent = JSON.parse(message.content.toString())
            } catch (e) {
              console.trace('Error processing message')
            }

            type._emitter.emit('data', ...messageContent)
            request._emitter.emit('data', ...messageContent)
          })
        }

        publishChannel.publish(
          remit._options.exchange,
          options.event,
          new Buffer(JSON.stringify(data)),
          messageOptions
        )

        type._emitter.emit('sent', data)
        request._emitter.emit('sent', data)
      })

    return new Promise((resolve, reject) => {
      request._emitter.on('data', (err, result) => {
        if (err) {
          return reject(err)
        }

        return resolve(result)
      })

      request._emitter.once('timeout', reject)
      request._emitter.once('error', reject)
    })
  }

  request._emitter = new EventEmitter()
  request.send = request

  request.data = function onData (callback) {
    request._emitter.on('data', callback)

    return request
  }

  request.sent = function onSent (callback) {
    request._emitter.on('sent', callback)

    return request
  }

  return request
}

module.exports = RequestType
