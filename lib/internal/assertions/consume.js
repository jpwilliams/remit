'use strict'

const debug = require('debug')('remit:consume')

module.exports = function __assert_consume (callback) {
    const self = this

    debug(`Creating new consume channel`)

    self.__assert('connection', (connection) => {
        connection.createChannel().then((channel) => {
            channel.on('close', () => {
                debug(`Channel died. Recreating.`)
                self._entities.consume = false
                self.__consume()
            })

            debug(`Channel created. Emitting success.`)
            self._entities.consume = channel
            self.__events.emit.apply(self, ['consume', channel])
        }).catch((err) => {
            throw err
        })
    })
}