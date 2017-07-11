const debug = require('debug')('remit:callback-handler')

module.exports = function getCallbackHandler (type, response, message, event) {
  const remit = this

  return function () {
    debug('Handling callback')

    event.finished = new Date()
    const responseData = JSON.stringify(Array.from(arguments).slice(0, 2))
    const shouldAck = !!type.options.shouldAck
    const shouldReply = !!message.properties.replyTo

    if (shouldReply) {
      return reply.apply(remit, [message, responseData, shouldAck, event, type, response])
    }

    debug('No need to reply')

    if (shouldAck) {
      return ack.apply(remit, [message, event, type, undefined, response])
    }

    debug('No need to acknowledge')
    type._emitter.emit('done', event)
  }
}

function ack (message, event, type, responseData, response) {
  debug('Acking')

  return new Promise((resolve, reject) => {
    try {
      response._consumeChannel.ack(message)
      resolve()
    } catch (e) {
      reject(e)
    } finally {
      type._emitter.emit('done', event, responseData)
    }
  })
}

function nack (message, requeue, event, type, response) {
  debug('Nacking')

  return new Promise((resolve, reject) => {
    try {
      response._consumeChannel.nack(message, false, requeue)
      resolve()
    } catch (e) {
      reject(e)
    } finally {
      type._emitter.emit('done', event)
    }
  })
}

function reply (message, responseData, shouldAck, event, type, response) {
  const remit = this

  debug('Replying')

  let workChannel

  remit._workChannelPool.acquire().then((channel) => {
    workChannel = channel

    return workChannel.checkQueue(message.properties.replyTo)
  }).then((ok) => {
    remit._workChannelPool.release(workChannel)

    response._publishChannel.sendToQueue(
      message.properties.replyTo,
      new Buffer(responseData),
      message.properties
    )

    if (!shouldAck) {
      type._emitter.emit('done', event, responseData)

      return
    }

    return ack.apply(remit, [message, event, type, responseData, response])
  }).catch((err) => {
    remit._workChannelPool.destroy(workChannel)

    if (err.message && err.message.substr(0, 16) === 'Operation failed') {
      if (!shouldAck) {
        type._emitter.emit('done', event)

        return
      }

      return nack.apply(remit, [message, false, event, type, response])
    }

    console.error(err)

    return reply.apply(remit, [message, responseData, shouldAck, event, type, response])
  })
}
