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

    ret.off = function off (event, func) {
        if (event) {
            if (!func || typeof func !== 'function') {
                ret.__events.removeAllListeners.apply(ret, [event])
            } else {
                ret.__events.removeListener.apply(ret, [event, func])
            }
        } else {
            ret.__events.removeAllListeners.apply(ret)

            if (!ret.consumerTag) {
                return ret
            }

            self.__assert('consume', function (consume_channel) {
                consume_channel.cancel(ret.consumerTag, function (err, ok) {
                    if (err) {
                        console.error(err)
                    }
                })
            })
        }

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

                    consume_channel.bindQueue(ok.queue, self._exchange_name, args.event, {}, function (err, ok) {
                        if (err) {
                            throw err
                        }

                        if (callback) {
                            ret.__events.on.apply(ret, ['data', callback])
                        }

                        consume_channel.consume(ok.queue, function (message) {
                            // Account for RabbitMQ cancelling the consumer
                            if (!message) {
                                // Delete our consumerTag reference so we don't try to
                                // cancel twice
                                delete ret.consumerTag

                                return
                            }

                            self.__receive_data(message, ret, master_options)
                        }, {
                            exclusive: false,
                            noAck: false
                        }, function (err, ok) {
                            if (err) {
                                throw err
                            }

                            // If we actually set up a consumer, store this tag
                            // so we're able to cancel it later.
                            if (ok.consumerTag) {
                                ret.consumerTag = ok.consumerTag
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