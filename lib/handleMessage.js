const getCallbackHandler = require('./handleCallback')
const parseEvent = require('./utils/parseEvent')
const serializeError = require('serialize-error')

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

  type._results = []
  response._results = []
  type._emitter.emit('data', event, callback)

  try {
    response._emitter.emit('data', event, callback)
  } catch (e) {
    console.error(e)

    if (e instanceof Error) {
      return callback(serializeError(e))
    }

    return callback(e)
  }

  const results = type._results.concat(response._results)

  const promises = results.reduce((list, result) => {
    if (result && result.then && typeof result.then === 'function') {
      list.push(result)
    }

    return list
  }, [])

  if (promises.length) {
    Promise
      .race(promises)
      .then((v) => callback(null, v))
      .catch((err) => {
        console.error(err)

        if (err instanceof Error) {
          return callback(serializeError(err))
        }

        return callback(err)
      })
  }
}

module.exports = handleMessage
