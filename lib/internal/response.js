'use strict'

const EventEmitter = require('eventemitter3')

module.exports = function __response (args, callback, options) {
    const self = this

    const emitter = new EventEmitter()

    self.__assert_connection(() => {
        self.__assert_exchange(() => {
            self.__assert_consume_channel((consume_channel) => {
                consume_channel.assertQueue(options.queueName || args.event, {
                    excusive: false,
                    durable: true,
                    autoDelete: false
                }).then((queue) => {
                    consume_channel.bindQueue(queue.queue, self._exchange_name, args.event).then(() => {
                        emitter.emit('ready')

                        if (callback) {
                            emitter.on('message', callback)
                        }

                        consume_channel.consume(queue.queue, (message) => {
                            self.__handle_message(message, emitter)
                        }, {
                            exclusive: false
                        })
                    })
                })
            })
        })
    })

    return emitter
}
