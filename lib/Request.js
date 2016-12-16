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

  return requestType
}

function Request (base, type, options) {
  const remit = this

  let request = function () {
    const data = Array.from(arguments)

    getPublishChannel()
      .then((publishChannel) => {
        publishChannel.publish(
          remit._options.exchange,
          options.event,
          new Buffer(data),
          {
            mandatory: true
          }
        )
      })

    return request
  }

  request.send = request

  request.data = function onData (callback) {
    return request
  }

  return request
}

module.exports = RequestType
