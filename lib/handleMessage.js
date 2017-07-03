const getCallbackHandler = require('./handleCallback')
const parseEvent = require('./utils/parseEvent')

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

  const event = parseEvent(message.properties, message.fields, messageContent)

  response._emitter.once('done', getCallbackHandler.apply(remit, [type, response, message, event]))
  type._emitter.emit('data', event, callback)
  response._emitter.emit('data', event, callback)
}

module.exports = handleMessage
