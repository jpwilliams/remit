const getCallbackHandler = require('./handleCallback')

function handleMessage (type, response, message) {
  const remit = this
  let messageContent

  try {
    messageContent = JSON.parse(message.content.toString())
    messageContent = Array.isArray(messageContent) ? messageContent[0] : messageContent
  } catch (e) {
    console.trace('Error processing message')
  }

  let callback = function callback () {
    response._emitter.emit('done', ...Array.from(arguments))
  }

  response._emitter.once('done', getCallbackHandler.apply(remit, [type, message]))

  const event = {
    eventId: message.properties.messageId,
    timestamp: new Date(message.properties.timestamp),
    eventType: message.fields.routingKey,
    resource: message.properties.appId,
    resourceTrace: message.properties.headers.trace,
    data: messageContent
  }

  type._emitter.emit('data', event, callback)
  response._emitter.emit('data', event, callback)
}

module.exports = handleMessage
