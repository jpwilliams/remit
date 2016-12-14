var debug = require('debug')('remit:assert')

module.exports = function __assert (event, options, callback) {
  var self = this

  debug('' + event + ' - asserting')
  self.__events.emit.apply(self, ['__assert_' + event])

  if (!callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    } else {
      return
    }
  }

  options = options || {}

  if (self._entities[event]) {
    debug('' + event + ' - exists')

    if (self._entities[event].__use) {
      self._entities[event].__use(options)
    }

    return callback(self._entities[event])
  }

  debug('' + event + ' - waiting')

  self.__events.once.apply(self, [event, function () {
    if (self._entities[event].__use) {
      self._entities[event].__use(options)
    }

    callback.apply(self, Array.from(arguments))
  }])
}
