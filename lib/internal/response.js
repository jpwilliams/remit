'use strict'

const EventEmitter = require('events').EventEmitter

module.exports = function __response (args, data, options) {
    const self = this

    const emitter = new EventEmitter()

    console.log('1')

    self.__assert_connection(() => {
        console.log('2')

        self.__assert_exchange(() => {
            console.log('3')

            self.__assert_consume_channel((consume_channel) => {
                console.log('4')

                consume_channel.assertQueue(options.queueName || args.event, {
                    excusive: false,
                    durable: true,
                    autoDelete: false
                }).then((queue) => {
                    console.log('5')

                    consume_channel.bindQueue(queue.queue, self._exchange_name, args.event).then(() => {
                        emitter.emit('ready')

                        consume_channel.consume(queue.queue, (message) => {
                            self.__handle_message(message)
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
