'use strict'

module.exports = function __assert_exchange (callback) {
    const self = this

    self.__emit('__assert_exchange')

    if (!callback) {
        return
    }

    if (self._exchange) {
        return callback()
    }

    self.once('__exchange_asserted', callback)
}
