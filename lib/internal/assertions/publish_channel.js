'use strict'

module.exports = function __assert_publish_channel (callback) {
    const self = this

    self.__emit('__assert_publish_channel')

    if (!callback) {
        return
    }

    if (self._publish_channel) {
        return callback(self._publish_channel)
    }

    self.once('__publish_channel', callback)
}
