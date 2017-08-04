const EventEmitter = require('eventemitter3')
const uuid = require('uuid')
const parseEvent = require('./utils/parseEvent')
const getPublishChannel = require('./assertions/reply')

function RequestType (masterOptions) {
  const remit = this

  let requestType = function (event, options) {
    if (!event) {
      throw new Error('No event given')
    }

    options = options || {}
    options.event = event

    if (masterOptions.before) {
      options = masterOptions.before(remit, options)
    }

    return Request.apply(remit, [null, requestType, options])
  }

  requestType._emitter = new EventEmitter()
  requestType._sentCallbacks = []
  requestType._dataCallbacks = []
  requestType._timeoutCallbacks = []

  requestType.options = {
    expectReply: !!masterOptions.expectReply
  }

  requestType.data = function onData (callback) {
    requestType._dataCallbacks.push(callback)

    return requestType
  }

  requestType.sent = function onSent (callback) {
    requestType._sentCallbacks.push(callback)

    return requestType
  }

  requestType.timeout = function onTimeout (callback) {
    requestType._timeoutCallbacks.push(callback)

    return requestType
  }

  return requestType
}

function Request (base, type, options) {
  const remit = this

  let request = function () {
    const extra = Array.from(arguments)
    const data = extra.shift() || {}
    const localOpts = Object.assign({}, request._options, extra.shift() || {})
    const now = +new Date()
    const messageId = uuid.v4()

    let trace
    let expiration
    let expirationGroup
    let timeout
    let event

    try {
      const re = /^\s{4}.+?(\/[^/].+?)\)/gm
      const stackTrace = (new Error()).stack.toString()
      re.exec(stackTrace)
      trace = re.exec(stackTrace)[1] || undefined
    } catch (e) {}

    let demitQueue

    if (!isNaN(localOpts.delay) || localOpts.schedule) {
      if ((!localOpts.delay || isNaN(localOpts.delay)) && (!localOpts.schedule || !(localOpts.schedule instanceof Date) || localOpts.schedule.toString() === 'Invalid Date')) {
        throw new Error('Invalid schedule date or delay duration when attempting to send a delayed emission')
      }

      if (localOpts.schedule) {
        expirationGroup = +localOpts.schedule
        expiration = +localOpts.schedule - now
      } else {
        expirationGroup = localOpts.delay
        expiration = localOpts.delay
      }

      if (expiration > 0) {
        demitQueue = new Promise((resolve, reject) => {
          let workChannel

          remit._workChannelPool.acquire().then((channel) => {
            workChannel = channel

            let queueOpts = {
              exclusive: false,
              durable: true,
              autoDelete: true,
              deadLetterExchange: remit._options.exchange,
              deadLetterRoutingKey: options.event,
              expires: expiration * 2
            }

            if (!localOpts.schedule) {
              queueOpts.messageTtl = expiration
            }

            return workChannel.assertQueue(`d:${remit._options.exchange}:${options.event}:${expirationGroup}`, queueOpts)
          }).then(() => {
            remit._workChannelPool.release(workChannel)

            return remit._publishPools[options.event]
          }).then(resolve).catch((err) => {
            remit._workChannelPool.destroy(workChannel)
            reject(err)
          })
        })
      } else {
        demitQueue = remit._publishPools[options.event]
      }
    } else {
      demitQueue = remit._publishPools[options.event]
    }

    let messageOptions = {
      mandatory: true,
      messageId: messageId,
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
        clearTimeout(timeout)

        try {
          messageContent = JSON.parse(message.content.toString())
        } catch (e) {
          console.trace('Error processing message')
        }

        type._emitter.emit(`data-${messageId}`, ...messageContent)
        request._emitter.emit(`data-${messageId}`, ...messageContent)
      })

      timeout = setTimeout(() => {
        const timeoutOpts = {
          code: 'timeout',
          message: 'Request timed out after 30000ms'
        }

        type._emitter.emit(`timeout-${messageId}`, timeoutOpts)
        request._emitter.emit(`timeout-${messageId}`, timeoutOpts)
      }, localOpts.timeout || 30000)
    }

    if (localOpts.priority) {
      if (localOpts.priority > 10 || localOpts.priority < 0) {
        throw new Error('Invalid priority', localOpts.priority, 'when pushing message')
      }

      messageOptions.priority = localOpts.priority
    }

    if (localOpts.schedule || localOpts.delay) {
      if (localOpts.schedule) {
        messageOptions.headers.schedule = +localOpts.schedule
        messageOptions.expiration = expiration
      } else {
        messageOptions.headers.delay = localOpts.delay
      }
    }

    event = parseEvent(messageOptions, {
      routingKey: options.event
    }, data)

    demitQueue.then((publishChannel) => {
      if (localOpts.schedule || localOpts.delay) {
        if (localOpts.schedule) {
          messageOptions.headers.schedule = +localOpts.schedule
        } else {
          messageOptions.headers.delay = localOpts.delay
        }

        publishChannel.sendToQueue(
          `d:${remit._options.exchange}:${options.event}:${expirationGroup}`,
          Buffer.from(JSON.stringify(data)),
          messageOptions
        )
      } else {
        publishChannel.publish(
          remit._options.exchange,
          options.event,
          Buffer.from(JSON.stringify(data)),
          messageOptions
        )
      }

      type._emitter.emit(`sent-${event.eventId}`, event)
      request._emitter.emit(`sent-${event.eventId}`, event)
    })

    return new Promise((resolve, reject) => {
      const cleanUp = (err, result) => {
        clearTimeout(timeout)

        if (type.options.expectReply) {
          request._emitter.removeAllListeners(`data-${messageId}`)
          request._emitter.removeAllListeners(`timeout-${messageId}`)
        }

        request._emitter.removeAllListeners(`sent-${messageId}`)
        request._emitter.removeAllListeners(`error-${messageId}`)

        if (err) return reject(err)
        return resolve(result)
      }

      if (type.options.expectReply) {
        request._emitter.once(`data-${messageId}`, cleanUp)
        type._dataCallbacks.forEach((callback) => {
          request._emitter.once(`data-${messageId}`, callback)
        })
        request._dataCallbacks.forEach((callback) => {
          request._emitter.once(`data-${messageId}`, callback)
        })

        request._emitter.once(`timeout-${messageId}`, cleanUp)
        type._timeoutCallbacks.forEach((callback) => {
          request._emitter.once(`timeout-${messageId}`, callback)
        })
        request._timeoutCallbacks.forEach((callback) => {
          request._emitter.once(`timeout-${messageId}`, callback)
        })
      } else {
        request._emitter.once(`sent-${messageId}`, a => cleanUp(null, a))
      }

      type._sentCallbacks.forEach((callback) => {
        request._emitter.once(`sent-${messageId}`, callback)
      })
      request._sentCallbacks.forEach((callback) => {
        request._emitter.once(`sent-${messageId}`, callback)
      })

      request._emitter.on(`error-${messageId}`, cleanUp)
    })
  }

  request._emitter = new EventEmitter()
  request._options = {}
  request._dataCallbacks = []
  request._sentCallbacks = []
  request._timeoutCallbacks = []

  if (!remit._publishPools[options.event]) {
    remit._publishPools[options.event] = getPublishChannel.apply(remit, [type, request])
  }

  request.send = request

  request.options = function setOptions (options) {
    request._options = Object.assign({}, request._options, options || {})

    return request
  }

  request.data = function onData (callback) {
    request._dataCallbacks.push(callback)

    return request
  }

  request.sent = function onSent (callback) {
    request._sentCallbacks.push(callback)

    return request
  }

  request.timeout = function onTimeout (callback) {
    request._timeoutCallbacks.push(callback)

    return request
  }

  return request
}

module.exports = RequestType
