'use strict'

const debug = require('debug')('remit:exchange')

module.exports = function __assert_exchange (callback) {
    const self = this

    debug(`Creating new exchange`)

    self.__assert('connection', (connection) => {
        self.__assert('work', (work_channel) => {
            work_channel.assertExchange(self._exchange_name, 'topic', {
                autoDelete: true
            }).then((exchange) => {
                debug(`Exchange created. Emitting success.`)
                self._entities.exchange = exchange
                self.__events.emit.apply(self, ['exchange', exchange])
            }).catch((err) => {
                debug(`Exchange assertion failed.`)
                throw err
            })
        })
    })
}