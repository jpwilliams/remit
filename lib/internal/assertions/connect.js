'use strict'

module.exports = function __assert_connection (callback) {
    const self = this

    self.__emit('__assert_connection')

    if (!callback) {
        return
    }

    if (self._connection) {
        return callback()
    }

    self.once('connect', callback)
}
