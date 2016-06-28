var debug = require('debug')('remit:receive')
var EventEmitter = require('eventemitter3')

module.exports = __receive

function __receive (skeleton, args, callback, options, master_options) {
    var self = this
    options = options || {}

    var ret = {
        __events: new EventEmitter()
    }
    
    ret.master_options = master_options

    ret.data = function data (callback) {
        ret.__events.on.apply(ret, ['data', callback])

        return ret
    }

    self.__assert('connection', function (connection) {
        self.__assert('exchange', function (exchange) {
            self.__assert('consume', function (consume_channel) {
                consume_channel.assertQueue(options.queueName || args.event, {
                    exclusive: false,
                    durable: true,
                    autoDelete: false
                }, function (err, ok) {
                    if (err) {
                        throw err
                    }

                    consume_channel.bindQueue(queue.queue, self._exchange_name, args.event, {}, function (err, ok) {
                        if (err) {
                            throw err
                        }

                        if (callback) {
                            ret.__events.on.apply(ret, ['data', callback])
                        }

                        consume_channel.consume(queue.queue, function (message) {
                            self.__receive_data(message, ret)
                        }, {
                            exclusive: true
                        }, function (err, ok) {
                            if (err) {
                                throw err
                            }

                            debug('Consuming ' + args.event + ' events')
                        })
                    })
                })
            })
        })
    })

    return ret
}