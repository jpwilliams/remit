var debug = require('debug')('remit:consume')

module.exports = function __assertConsume (callback) {
  var self = this

  debug('Creating new consume channel')

  self.__assert('connection', function (connection) {
    connection.createChannel(function (err, channel) {
      if (err) {
        throw err
      }

      channel.on('error', function (err) {
        console.error(err)
      })

      channel.on('close', function () {
        debug('Channel died. Recreating.')
        self._entities.consume = false
        self.__consume()
      })

      debug('Channel created. Emitting success.')
      self._entities.consume = channel
      self.__events.emit.apply(self, ['consume', channel])
    })
  })
}
