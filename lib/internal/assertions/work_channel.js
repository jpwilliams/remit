'use strict'

module.exports = function __assert_work_channel (callback) {
    const self = this

    self.__emit('__assert_work_channel')

    if (!callback) {
        return
    }

    if (self._work_channel) {
        return callback(self._work_channel)
    }

    self.once('__work_channel', callback)
}
