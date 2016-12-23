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

  if (requestType.options.expectReply) {
    consumeReplies.apply(remit)
  }

  return requestType
}

function Request (base, type, options) {
  const remit = this

  let request = function () {
    const data = Array.from(arguments)

    ;(type.options.expectReply ? consumeReplies() : Promise.resolve())
      .then(() => {
        return getPublishChannel()
      }).then((publishChannel) => {
        debug('Sending message...')

        let messageOptions = {
          mandatory: true
        }

        if (type.options.expectReply) {
          messageOptions.correlationId = uuid.v4()
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
      })

    return new Promise((resolve, reject) => {
      request._emitter.once('data', function () {
        console.log(arguments)

        resolve(...arguments)
      })
      request._emitter.once('timeout', reject)
      request._emitter.once('error', reject)
    })
  }

  request._emitter = new EventEmitter()
  request.send = request

  request.data = function onData (callback) {
    request._emitter.once('data', callback)

    return request
  }

  return request
}

module.exports = RequestType
