'use strict'

const debug = require('debug')('remit:work')

module.exports = function __assert_work (callback) {
    const self = this

    debug(`Creating new work channel`)

    self.__assert('connection', (connection) => {
        connection.createChannel().then((channel) => {
            channel.on('error', (err) => {
                console.error(`Work channel died, probably because routing response back to a requester failed. Recreating.`)
            })

            channel.on('close', () => {
                debug(`Channel died. Recreating.`)
                self._entities.work = false
                self.__work()
            })

            debug(`Channel created. Emitting success.`)
            self._entities.work = channel
            self.__events.emit.apply(self, ['work', channel])
        }).catch((err) => {
            throw err
        })
    })
}