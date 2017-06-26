const debug = require('debug')('remit:callback-handler')
const getConsumeChannel = require('./assertions/consumeChannel')
const getPublishChannel = require('./assertions/publishChannel')

module.exports = function getCallbackHandler (type, message, event) {
  const remit = this

  return function () {
    debug('Handling callback')

    event.finished = new Date()
    const responseData = JSON.stringify(Array.from(arguments).slice(0, 2))
    const shouldAck = !!type.options.shouldAck
    const shouldReply = !!message.properties.replyTo

    if (shouldReply) {
      return reply.apply(remit, [message, responseData, shouldAck, event, type])
    }

    debug('No need to reply')

    if (shouldAck) {
      return ack.apply(remit, [message, event, type])
    }

    debug('No need to acknowledge')
    type._emitter.emit('done', event)
  }
}

function ack (message, event, type, responseData) {
  const remit = this

  debug('Acking')

  return new Promise((resolve, reject) => {
    getConsumeChannel.apply(remit)
      .then((consumeChannel) => {
        try {
          consumeChannel.ack(message)

          return resolve()
        } catch (e) {
          return reject(e)
        } finally {
          type._emitter.emit('done', event, responseData)
        }
      })
  })
}

function nack (message, requeue, event, type) {
  const remit = this

  debug('Nacking')

  return new Promise((resolve, reject) => {
    getConsumeChannel.apply(remit)
      .then((consumeChannel) => {
        try {
          consumeChannel.nack(message, false, requeue)

          return resolve()
        } catch (e) {
          return reject(e)
        } finally {
          type._emitter.emit('done', event)
        }
      })
  })
}

function reply (message, responseData, shouldAck, event, type) {
  const remit = this

  debug('Replying')

  let workChannel

  remit._workChannelPool.acquire().then((channel) => {
    workChannel = channel

    return workChannel.checkQueue(message.properties.replyTo)
  }).then((ok) => {
    remit._workChannelPool.release(workChannel)

    return getPublishChannel.apply(remit)
  }).then((publishChannel) => {
    publishChannel.sendToQueue(message.properties.replyTo, new Buffer(responseData), message.properties)

    if (!shouldAck) {
      type._emitter.emit('done', event, responseData)

      return
    }

    return ack.apply(remit, [message, event, type, responseData])
  }).catch((err) => {
    remit._workChannelPool.destroy(workChannel)

    if (err.message && err.message.substr(0, 16) === 'Operation failed') {
      if (!shouldAck) {
        type._emitter.emit('done', event)

        return
      }

      return nack.apply(remit, [message, false, event, type])
    }

    console.error(err)

    return reply.apply(remit, [message, responseData, shouldAck, event, type])
  })
}
