'use strict'

const debug = require('debug')('remit:publish')

module.exports = function __assert_publish (callback) {
    const self = this

    debug(`Creating new publish channel`)

    self.__assert('connection', (connection) => {
        connection.createChannel().then((channel) => {
            channel.on('close', () => {
                debug(`Channel died. Recreating.`)
                self._entities.publish = false
                self.__publish()
            })

            debug(`Channel created. Emitting success.`)
            self._entities.publish = channel
            self.__events.emit.apply(self, ['publish', channel])
        }).catch((err) => {
            throw err
        })
    })
}