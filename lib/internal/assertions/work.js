var debug = require('debug')('remit:work')

module.exports = function __assert_work (callback) {
    var self = this

    debug('Creating new work channel')

    self.__assert('connection', function (connection) {
        connection.createChannel(function (err, channel) {
            if (err) {
                throw err
            }

            channel.on('error', function (err) {
                console.error('Work channel died, probably because routing response back to a requester failed. Recreating.')
                self._entities.work = false
                self.__work()
            })

            channel.on('close', function () {
                debug('Channel died. Recreating.')
                self._entities.work = false
                self.__work()
            })

            debug('Channel created. Emitting success.')
            self._entities.work = channel
            self.__events.emit.apply(self, ['work', channel])
        })
    })
}