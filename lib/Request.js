const debug = require('debug')('remit:request')
const EventEmitter = require('eventemitter3')
const getPublishChannel = require('./assertions/publishChannel')

function RequestType (masterOptions) {
  const remit = this

  let requestType = function (event, options) {
    if (!event) {
      throw new Error('No event given')
    }

    this.options = options || {}
    this.options.event = event

    return Request.apply(remit, [null, requestType, this.options])
  }

  requestType._emitter = new EventEmitter()

  return requestType
}

function Request (base, type, options) {
  const remit = this

  let request = function () {
    const data = Array.from(arguments)

    getPublishChannel().then((publishChannel) => {
      debug('Sending message...')

      publishChannel.publish(
        remit._options.exchange,
        options.event,
        new Buffer(JSON.stringify(data)),
        {
          mandatory: true
        }
      )
    })

    return request
  }

  request._emitter = new EventEmitter()
  request.send = request

  request.data = function onData (callback) {
    request._emitter.on('data', callback)

    return request
  }

  return request
}

module.exports = RequestType
