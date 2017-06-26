const getCallbackHandler = require('./handleCallback')

function handleMessage (type, response, message) {
  const remit = this
  let messageContent

  try {
    messageContent = JSON.parse(message.content.toString())
  } catch (e) {
    const err = new Error('Error processing message', message.properties)
    const sentError = type._emitter.emit('error', err)

    if (!sentError) {
      throw err
    }

    return
  }

  let callback = function callback () {
    response._emitter.emit('done', ...Array.from(arguments))
  }

  let event = {
    eventId: message.properties.messageId,
    eventType: message.fields.routingKey,
    resource: message.properties.appId,
    data: messageContent
  }

  if (message.properties.headers) {
    if (message.properties.headers.uuid) {
      event.eventId = message.properties.headers.uuid
    }

    if (message.properties.headers.scheduled) {
      event.scheduled = new Date(message.properties.headers.scheduled)
    }

    if (message.properties.headers.trace) {
      event.resourceTrace = message.properties.headers.trace
    }
  }

  if (message.properties.timestamp) {
    if (message.properties.timestamp.toString().length === 10) {
      message.properties.timestamp *= 1000
    }

    event.timestamp = new Date(message.properties.timestamp)
  }

  event.started = new Date()

  response._emitter.once('done', getCallbackHandler.apply(remit, [type, response, message, event]))
  type._emitter.emit('data', event, callback)
  response._emitter.emit('data', event, callback)
}

module.exports = handleMessage
