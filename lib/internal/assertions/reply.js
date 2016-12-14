var debug = require('debug')('remit:reply')

module.exports = function __assertReply (callback) {
  var self = this

  debug('Starting reply consumption')

  self.__assert('connection', function (connection) {
    self.__assert('publish', function (publishChannel) {
      publishChannel.consume('amq.rabbitmq.reply-to', function (message) {
        self.__events.emit.apply(self, [message.properties.correlationId].concat(Array.from(arguments)))
      }, {
        exclusive: true,
        noAck: true
      }, function (err, ok) {
        if (err) {
          throw err
        }

        debug('Reply consumption engaged')

        self._entities.reply = publishChannel

        self._entities.reply.__use = function __use (options) {
          if (options.id) {
            self.__events.once.apply(self, [options.id, options.__incoming])
          }
        }

        self.__events.emit.apply(self, ['reply', publishChannel])
      })
    })
  })
}
