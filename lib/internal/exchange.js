'use strict'

module.exports = function __exchange (callback) {
    const self = this

    self.__assert_connection(() => {
        self.__assert_work_channel((work_channel) => {
            work_channel.assertExchange(self._exchange_name, 'topic', {
                autoDelete: true
            }).then(() => {
                self._exchange = true
                self.__emit('__exchange_asserted')
            }).catch((err) => {
                self.__emit('error', err)
            })
        })
    })
}
