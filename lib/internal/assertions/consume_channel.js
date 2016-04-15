'use strict'

module.exports = function __assert_consume_channel (callback) {
    const self = this

    self.__emit('__assert_consume_channel')

    if (!callback) {
        return
    }

    if (self._consume_channel) {
        return callback(self._consume_channel)
    }

    self.once('__consume_channel', callback)
}
