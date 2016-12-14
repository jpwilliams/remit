var debug = require('debug')('remit:publish')

module.exports = function __assertPublish (callback) {
  var self = this

  debug(`Creating new publish channel`)

  self.__assert('connection', function (connection) {
    connection.createChannel(function (err, channel) {
      if (err) {
        throw err
      }

      channel.on('close', function () {
        debug('Channel died. Recreating.')
        self._entities.publish = false
        self.__publish()
      })

      debug('Channel created. Emitting success.')
      self._entities.publish = channel
      self.__events.emit.apply(self, ['publish', channel])
    })
  })
}
