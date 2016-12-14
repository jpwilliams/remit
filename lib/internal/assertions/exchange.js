var debug = require('debug')('remit:exchange')

module.exports = function __assertExchange (callback) {
  var self = this

  debug('Creating new exchange')

  self.__assert('connection', function (connection) {
    self.__assert('work', function (workChannel) {
      workChannel.assertExchange(self._exchange_name, 'topic', {
        autoDelete: true
      }, function (err, ok) {
        if (err) {
          debug('Exchange assertion failed.')

          throw err
        }

        debug('Exchange created. Emitting success.')
        self._entities.exchange = ok
        self.__events.emit.apply(self, ['exchange', ok])
      })
    })
  })
}
