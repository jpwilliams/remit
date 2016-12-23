const debug = require('debug')('remit:callback-handler')
const getConsumeChannel = require('./assertions/consumeChannel')
const getWorkChannel = require('./assertions/workChannel')
const getPublishChannel = require('./assertions/publishChannel')

module.exports = function getCallbackHandler (type, message) {
  return function () {
    debug('Handling callback')

    const responseData = new Buffer(JSON.stringify(Array.from(arguments).slice(0, 2)))
    const shouldAck = !!type.options.shouldAck
    const shouldReply = !!message.properties.replyTo

    if (shouldReply) {
      return reply(message, responseData, shouldAck)
    }

    debug('No need to reply')

    if (shouldAck) {
      return ack(message)
    }

    debug('No need to acknowledge')
  }
}

function ack (message) {
  debug('Acking')

  return new Promise((resolve, reject) => {
    getConsumeChannel()
      .then((consumeChannel) => {
        try {
          consumeChannel.ack(message)

          return resolve()
        } catch (e) {
          return reject(e)
        }
      })
  })
}

function nack (message, requeue) {
  debug('Nacking')

  return new Promise((resolve, reject) => {
    getConsumeChannel()
      .then((consumeChannel) => {
        try {
          consumeChannel.nack(message, false, requeue)

          return resolve()
        } catch (e) {
          return reject(e)
        }
      })
  })
}

function reply (message, responseData, shouldAck) {
  debug('Replying')

  getWorkChannel()
    .then((workChannel) => {
      return workChannel.checkQueue(message.properties.replyTo)
    }).then((ok) => {
      return getPublishChannel()
    }).then((publishChannel) => {
      publishChannel.sendToQueue(message.properties.replyTo, responseData, message.properties)

      if (!shouldAck) {
        return
      }

      return ack(message)
    }).catch((err) => {
      if (err.message && err.message.substr(0, 16) === 'Operation failed') {
        if (!shouldAck) {
          return
        }

        return nack(message, false)
      }

      console.error(err)

      return reply(message, responseData, shouldAck)
    })
}
