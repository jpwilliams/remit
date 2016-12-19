const getCallbackHandler = require('./handleCallback')

function handleMessage (type, response, message) {
  let messageContent

  try {
    messageContent = JSON.parse(message.content.toString())[0]
  } catch (e) {
    console.trace('Error processing message')
  }

  let callback = function callback () {
    response._emitter.emit('done', ...Array.from(arguments))
  }

  response._emitter.once('done', getCallbackHandler(type, message))

  type._emitter.emit('data', messageContent, callback)
  response._emitter.emit('data', messageContent, callback)
}

module.exports = handleMessage
