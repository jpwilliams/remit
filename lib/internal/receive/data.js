module.exports = function __receiveData (message, endpoint, masterOptions) {
  var self = this

  masterOptions = masterOptions || {}
  var doneCalled = false
  var retryCalled = false
  var failCalled = false
  // var retryTime = 0
  var data = self.__parser.request(message)

  var done = function context () {
    if (doneCalled) {
      return console.trace('Endpoint acknowledgement already done!')
    }

    endpoint.__events.emit.apply(endpoint.__events, ['done'].concat(Array.from(arguments)))
  }

  done.headers = data.headers
  done.success = done

  done.failure = function failure () {
    failCalled = true
    done()
  }

  done.retry = function retry (time) {
    retryCalled = true
    // retryTime = time
    done()
  }

  endpoint.__events.once('done', function responseComplete () {
    doneCalled = true
    var responseData = self.__parser.response.build(data, Array.from(arguments))

    var options = {}

    function ack () {
      self.__assert('consume', function (consumeChannel) {
        consumeChannel.ack(message)
      })
    }

    function nack (requeue) {
      self.__assert('consume', function (consumeChannel) {
        consumeChannel.nack(message, false, requeue)
      })
    }

    function publish () {
      self.__assert('work', function (workChannel) {
        workChannel.checkQueue(data.headers.reply_to, function (err, ok) {
          if (err) {
            if (err.message.substr(0, 16) === 'Operation failed') {
              self.__assert('consume', function (consumeChannel) {
                consumeChannel.nack(message, false, false)
              })
            } else {
              publish()
            }
          }

          if (!ok) {
            return
          }

          self.__assert('publish', function (publishChannel) {
            publishChannel.publish('', data.headers.reply_to, responseData, options)
            ack()
          })
        })
      })
    }

    if (failCalled) {
      return nack()
    }

    if (retryCalled) {
      return nack(true)
    }

    if (!data.headers.correlation_id || (endpoint.masterOptions && endpoint.masterOptions.reply === false)) {
      return ack()
    }

    options.correlationId = data.headers.correlation_id

    publish()
  })

  self[masterOptions.top_level || 'respond'].__events.emit.apply(self[masterOptions.top_level || 'respond'].__events, ['data', done].concat(data.data))
  endpoint.__events.emit.apply(endpoint, ['data', done].concat(data.data))
}
