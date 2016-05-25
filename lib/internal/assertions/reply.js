'use strict'

const debug = require('debug')('remit:reply')

module.exports = function __assert_reply (callback) {
    const self = this

    debug(`Starting reply consumption`)

    self.__assert('connection', (connection) => {
        self.__assert('publish', (publish_channel) => {
            publish_channel.consume('amq.rabbitmq.reply-to', function (message) {
                self.__events.emit.apply(self, [message.properties.correlationId].concat(Array.from(arguments)))
            }, {
                exclusive: true,
                noAck: true
            }).then(() => {
                debug(`Reply consumption engaged`)
                
                self._entities.reply = publish_channel
                
                self._entities.reply.__use = function __use (options) {
                    if (options.id) {
                        self.__events.once.apply(self, [options.id, options.__incoming])
                    }
                }
                
                self.__events.emit.apply(self, ['reply', publish_channel])
            })
        })
    })
}