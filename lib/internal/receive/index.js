'use strict'

const debug = require('debug')('remit:receive')
const EventEmitter = require('eventemitter3')

module.exports = __receive

function __receive (args, callback, options) {
    const self = this
    options = options || {}

    let ret = {
        __events: new EventEmitter()
    }

    ret.data = function data (callback) {
        ret.__events.on.apply(ret, ['data', callback])

        return ret
    }

    self.__assert('connection', (connection) => {
        self.__assert('exchange', (exchange) => {
            self.__assert('consume', (consume_channel) => {
                consume_channel.assertQueue(options.queue || args.event, {
                    exclusive: false,
                    durable: true,
                    autoDelete: false
                }).then((queue) => {
                    consume_channel.bindQueue(queue.queue, self._exchange_name, args.event).then(() => {
                        if (callback) {
                            ret.__events.on.apply(ret, ['data', callback])
                        }

                        consume_channel.consume(queue.queue, (message) => {
                            self.__receive_data(message, ret)
                        }, {
                            exclusive: false
                        })

                        debug(`Consuming '${args.event}' events`)
                    })
                })
            })
        })
    })

    return ret
}