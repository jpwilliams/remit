'use strict'

const os = require('os')
const uuid = require('uuid').v4
const trace = require('stack-trace')
const amqplib = require('amqplib/callback_api')
const Pool = require('pool2')

module.exports = function (opts) {
    return new Remit(opts)
}






function Remit (opts) {
    if (!opts) opts = {}
    const self = this

    // Exposed items
    this._service_name = opts.name || ''
    this._url = opts.url || 'amqp://localhost'
    this._trace = opts.trace === false ? false : true
    this._exchange_name = opts.exchange || 'remit'
    this._prefetch = parseInt(opts.prefetch)
    if (isNaN(this._prefetch)) this._prefetch = 128

    // Global items
    this._connection = opts.connection || null
    this._consume_channel = null
    this._publish_channel = null
    this._exchange = null

    // Callback queues
    this._connection_callbacks = []
    this._exchange_callbacks = []
    this._consume_channel_callbacks = []
    this._publish_channel_callbacks = []
    this._work_channel_callbacks = []

    // Callback trackers
    this._results_callbacks = {}
    this._results_timeouts = {}

    // States
    this._consuming_results = false
    this._listener_counts = {}

    // Temp channels
    this._worker_pool = new Pool({
        acquire: (callback) => {
            self.__connect(() => {
                self._connection.createChannel((err, channel) => {
                    if (err) return callback(err)

                    channel.on('error', () => {})
                    channel.on('close', () => {})

                    return callback(null, channel)
                })
            })
        },

        dispose: (channel, callback) => {
            callback()
        },

        min: 5,
        max: 10
    })

    return this
}






Remit.prototype.on_error = null
Remit.prototype.version = require('./package.json').version






Remit.prototype.res = function res (event, callbacks, context, options) {
    const self = this

    // Set up default options if we haven't been given any.
    options = options || {}

    self.__connect(() => {
        self.__assert_exchange(() => {
            const chosen_queue = options.queueName || event

            const queueOptions = {
                durable: (options.hasOwnProperty('durable')) ? !!options.durable : true,
                autoDelete: (options.hasOwnProperty('autoDelete')) ? !!options.autoDelete : false,
                exclusive: (options.hasOwnProperty('exclusive')) ? !!options.exclusive : false
            }

            const consumerOptions = {
                noAck: (options.hasOwnProperty('noAck')) ? !!options.noAck : false,
                exclusive: (options.hasOwnProperty('exclusive')) ? !!options.exclusive : false
            }

            self.__use_consume_channel(() => {
                // TODO Check this for a valid response
                self._consume_channel.assertQueue(chosen_queue, queueOptions)
            })

            self.__use_consume_channel(() => {
                self._consume_channel.bindQueue(chosen_queue, self._exchange_name, event, {}, (err, ok) => {
                    if (err) {
                        console.error(err)
                    }

                    self._consume_channel.consume(chosen_queue, (message) => {
                        if (message === null) {
                          throw new Error('Consumer cancelled')
                        }

                        if (!message.properties.timestamp) {
                            self.__consume_res(message, callbacks, context, consumerOptions)
                        } else {
                            const time_to_wait = parseInt(message.properties.timestamp - new Date().getTime())

                            if (time_to_wait <= 0) {
                                self.__consume_res(message, callbacks, context, consumerOptions)
                            } else {
                                setTimeout(() => {
                                    self.__consume_res(message, callbacks, context, consumerOptions)
                                }, time_to_wait)
                            }
                        }
                    }, consumerOptions)
                })
            })
        })
    })
}






Remit.prototype.req = function req (event, args, callback, options, caller) {
    const self = this

    if (!options) {
        options = {}
    }

    if (self._trace) {
        if (!caller) {
            caller = trace.get(Remit.prototype.req)[0].toString()
        }

        options.appId = self._service_name
        options.messageId = caller
        options.type = event
    }

    options.headers = options.headers || {}
    options.headers.uuid = uuid()

    self.__connect(() => {
        self.__assert_exchange(() => {
            if (!callback) {
                return self.__use_publish_channel(() => {
                    self._publish_channel.publish(self._exchange_name, event, new Buffer(JSON.stringify(args || {})), options)
                })
            }

            if (!self._consuming_results) {
                self._consuming_results = true

                self.__use_publish_channel(() => {
                    self._publish_channel.consume('amq.rabbitmq.reply-to', function (message) {
                        self.__on_result.apply(self, arguments)
                    }, {
                        exclusive: true,
                        noAck: true
                    }, (err, ok) => {
                        if (err) {
                            console.warn(err)
                        } else {
                            send_message()
                        }
                    })
                })
            } else {
                send_message()
            }

            function send_message () {
                const correlation_id = uuid()

                self._results_callbacks[correlation_id] = {
                    callback: callback,
                    context: null,
                    autoDeleteCallback: true
                }

                options.mandatory = true
                options.replyTo = 'amq.rabbitmq.reply-to'
                options.correlationId = correlation_id

                self._results_timeouts[correlation_id] = setTimeout(function () {
                    if (!self._results_callbacks[correlation_id]) {
                        return
                    }

                    delete self._results_callbacks[correlation_id]
                    delete self._results_timeouts[correlation_id]

                    try {
                        callback({
                            event: event,
                            args: args,
                            options: options,
                            message: `Timed out after no response for ${options.timeout || 5000}ms`
                        })
                    } catch (e) {
                        if (self.on_error) {
                            self.on_error(e)
                        } else {
                            throw e
                        }
                    }
                }, options.timeout || 5000)

                self.__use_publish_channel(() => {
                    self._publish_channel.publish(self._exchange_name, event, new Buffer(JSON.stringify(args || {})), options)
                })
            }
        })
    })
}






Remit.prototype.listen = function listen (event, callback, context, options) {
    const self = this

    if (!self._service_name) {
        throw new Error('Must provide a service name if listening')
    }

    if (!options) {
        options = {}
    }

    self._listener_counts[event] = self._listener_counts[event] || 0
    options.queueName = `${event}:emission:${self._service_name}:${++self._listener_counts[event]}`

    self.res.call(self, event, callback, context, options)
}






Remit.prototype.ares = function ares (event, callback, context, options) {
    const self = this
    options = options || {}
    options.noAck = true

    self.res.call(self, event, callback, context, options)
}






Remit.prototype.alisten = function ares (event, callback, context, options) {
    const self = this
    options = options || {}
    options.noAck = true

    self.listen.call(self, event, callback, context, options)
}






Remit.prototype.emit = function emit (event, args, options) {
    const self = this

    if (!options) {
        options = {}
    }

    options.broadcast = true
    options.autoDeleteCallback = options.ttl ? false : true

    let caller

    if (self._trace) {
        caller = trace.get(Remit.prototype.emit)[0].toString()
    }

    self.req.call(self, event, args, options.onResponse, options, caller)
}






Remit.prototype.demit = function demit (event, delay, args, options) {
    const self = this

    if (!options) {
        options = {}
    }

    options.broadcast = true
    options.autoDeleteCallback = options.ttl ? false : true

    if (Object.prototype.toString.call(delay) === '[object Date]') {
        options.timestamp = delay.getTime()
    }

    let caller

    if (self._trace) {
        caller = trace.get(Remit.prototype.demit)[0].toString()
    }

    self.req.call(self, event, args, options.onResponse, options, caller)
}






Remit.prototype.treq = function treq (event, args, callback, options) {
    const self = this

    if (!options) {
        options = {}
    }

    if (!options.expiration) {
        options.expiration = 5000
    }

    if (!options.timeout) {
        options.timeout = 5000
    }

    let caller

    if (self._trace) {
        caller = trace.get(Remit.prototype.treq)[0].toString()
    }

    self.req(event, args, callback, options, caller)
}






Remit.prototype.__connect = function __connect (callback) {
    const self = this

    // If no callback was given, we still pretend there
    // is one. We use this to signify queue presence.
    if (!callback) {
        callback = function () {}
    }

    // If a connection already exists
    if (self._connection) {
        // If there are still callbacks being processed,
        // hop into the queue; no need to trigger it now.
        // Be British and get in line!
        if (self._connection_callbacks.length) {
            self._connection_callbacks.push(callback)

            return
        }

        // Otherwise we do need to trigger now. We missed
        // the queue. #awkward
        return callback()
    }

    // If we're here, a connection doesn't currently exist.
    // Now we check whether we're the first call to do this.
    // If we are, we'll be the ones to try and connect.
    const first = !self._connection_callbacks.length

    // Push our callback in to the queue, eh?
    self._connection_callbacks.push(callback)

    if (!first) {
        return
    }

    let connection_options = {}

    if (self._service_name) {
        connection_options.clientProperties = {
            connection_name: self._service_name
        }
    }

    // So let's connect!
    amqplib.connect(self._url, connection_options, (err, connection) => {
        if (err) {
            throw err
        }

        // Everything's go fine, so we'll set this global
        // object to our new connection.
        self._connection = connection

        // Time to run the callbacks. Let's run them and
        // take them out of the queue.
        // Loop through and make everything happen!
        while (self._connection_callbacks.length > 0) {
            self._connection_callbacks[0]()
            self._connection_callbacks.shift()
        }
    })
}






Remit.prototype.__use_consume_channel = function __use_consume_channel (callback) {
    const self = this

    if (!callback) {
        callback = function () {}
    }

    if (self._consume_channel) {
        if (self._consume_channel_callbacks.length) {
            self._consume_channel_callbacks.push(callback)

            return
        }

        return callback()
    }

    const first = !self._consume_channel_callbacks.length
    self._consume_channel_callbacks.push(callback)

    if (!first) {
        return
    }

    self.__connect(() => {
        self._connection.createChannel((err, channel) => {
            channel.on('error', (err) => {
                console.error(err)
                self._consume_channel = null
                self.__use_consume_channel()
            })

            channel.on('close', () => {
                throw new Error('Consumption channel closed')
                self._consume_channel = null
                self.__use_consume_channel()
            })

            channel.prefetch(self._prefetch)

            self._consume_channel = channel

            // Loop through and make everything happen!
            while (self._consume_channel_callbacks.length > 0) {
                self._consume_channel_callbacks[0]()
                self._consume_channel_callbacks.shift()
            }
        })
    })
}






Remit.prototype.__use_publish_channel = function __use_publish_channel (callback) {
    const self = this

    if (!callback) {
        callback = function () {}
    }

    if (self._publish_channel) {
        if (self._publish_channel_callbacks.length) {
            self._publish_channel_callbacks.push(callback)

            return
        }

        return callback()
    }

    const first = !self._publish_channel_callbacks.length
    self._publish_channel_callbacks.push(callback)

    if (!first) {
        return
    }

    self.__connect(() => {
        self._connection.createChannel((err, channel) => {
            channel.on('error', (err) => {
                console.error(err)
                self._publish_channel = null
                self.__use_publish_channel()
            })

            channel.on('close', () => {
                throw new Error('Publish channel closed')
                self._publish_channel = null
                self.__use_publish_channel()
            })

            self._publish_channel = channel

            // Loop through and make everything happen!
            while (self._publish_channel_callbacks.length > 0) {
                self._publish_channel_callbacks[0]()
                self._publish_channel_callbacks.shift()
            }
        })
    })
}






Remit.prototype.__assert_exchange = function __assert_exchange (callback) {
    const self = this

    // If no callback was given, we still pretend there
    // is one. We use this to signify queue presence.
    if (!callback) {
        callback = function () {}
    }

    // If the exchange already exists
    if (self._exchange) {
        // If there are still callbacks being processed,
        // hop into the queue; no need to trigger it now.
        // Be British and get in line!
        if (self._exchange_callbacks.length) {
            self._exchange_callbacks.push(callback)

            return
        }

        // Otherwise we do need to trigger now. We missed
        // the queue. #awkward
        return callback()
    }

    // If we're here, an exchange doesn't currently exist.
    // Now we check whether we're the first call to do this.
    // If we are, we'll be the ones to try and connect.
    const first = !self._exchange_callbacks.length

    // Push our callback in to the queue, eh?
    self._exchange_callbacks.push(callback)

    if (!first) {
        return
    }

    // Let's try making this exchange!
    self._worker_pool.acquire((err, channel) => {
        channel.assertExchange(self._exchange_name, 'topic', {
            autoDelete: true
        }, (err, ok) => {
            if (err) {
                console.error(err)
                self._worker_pool.remove(channel)
            }

            self._worker_pool.release(channel)

            // Everything went awesome so we'll let everything
            // know that the exchange is up.
            self._exchange = true

            // Time to run any callbacks that were waiting on
            // this exchange being made.
            // Loop through and make everything happen!
            while (self._exchange_callbacks.length > 0) {
                self._exchange_callbacks[0]()
                self._exchange_callbacks.shift()
            }
        })
    })
}






Remit.prototype.__consume_res = function __consume_res (message, callbacks, context, consumerOptions) {
    const self = this

    let data

    try {
        data = JSON.parse(message.content.toString())
    } catch (e) {
        return self.__use_consume_channel(() => {
            self._consume_channel.nack(message, false, false)
        })
    }

    const extra = {
        service: message.properties.appId,
        event: message.properties.type,
        caller: message.properties.messageId,
        timestamp: message.properties.timestamp ? new Date(parseInt(message.properties.timestamp) * 1000) : new Date(),
        uuid: message.properties.headers && message.properties.headers.uuid
    }

    if (!message.properties.correlationId || !message.properties.replyTo) {
        function done (err, data) {
            self.__use_consume_channel(() => {
                if (!consumerOptions.noAck) self._consume_channel.ack(message)
            })
        }

        try {
            step_through_callbacks(callbacks, data, extra, done)
        } catch (e) {
            if (message.properties.headers && message.properties.headers.attempts && message.properties.headers.attempts > 4) {
                self.__use_consume_channel(() => {
                    if (!consumerOptions.noAck) self._consume_channel.nack(message, false, false)
                })
            } else {
                message.properties.headers = increment_headers(message.properties.headers)

                function check_and_republish() {
                    self._worker_pool.acquire((err, channel) => {
                        channel.checkQueue(message.properties.replyTo, (err, ok) => {
                            if (err) {
                                self._worker_pool.remove(channel)

                                // If we got a proper queue error then the queue must
                                // just not be around.
                                if (err.message.substr(0, 16) === 'Operation failed') {
                                    self.__use_consume_channel(() => {
                                        self._consume_channel.nack(message, false, false)
                                    })
                                } else {
                                    check_and_republish()
                                }
                            } else {
                                self._worker_pool.release(channel)

                                self.__use_publish_channel(() => {
                                    self._publish_channel.publish('', message.properties.replyTo, message.content, message.properties)
                                })

                                self.__use_consume_channel(() => {
                                    if (!consumerOptions.noAck) self._consume_channel.ack(message)
                                })
                            }
                        })
                    })
                }

                check_and_republish()
            }

            if (self.on_error) {
                self.on_error(e)
            } else {
                throw e
            }
        }
    } else {
        function done (err, data) {
            const options = {correlationId: message.properties.correlationId}
            const res_data = new Buffer(JSON.stringify(Array.prototype.slice.call(arguments)))

            function check_and_publish () {
                self._worker_pool.acquire((err, channel) => {
                    channel.checkQueue(message.properties.replyTo, (err, ok) => {
                        if (err) {
                            self._worker_pool.remove(channel)

                            // If we got a proper queue error then the queue must
                            // just not be around.
                            if (err.message.substr(0, 16) === 'Operation failed') {
                                self.__use_consume_channel(() => {
                                    if (!consumerOptions.noAck) self._consume_channel.nack(message, false, false)
                                })
                            } else {
                                check_and_publish()
                            }
                        } else {
                            self._worker_pool.release(channel)

                            self.__use_publish_channel(() => {
                                self._publish_channel.publish('', message.properties.replyTo, res_data, options)
                            })

                            self.__use_consume_channel(() => {
                                if (!consumerOptions.noAck) self._consume_channel.ack(message)
                            })
                        }
                    })
                })
            }

            check_and_publish()
        }

        try {
            step_through_callbacks(callbacks, data, extra, done)
        } catch (e) {
            if (message.properties.headers && message.properties.headers.attempts && message.properties.headers.attempts > 4) {
                self.__use_consume_channel(() => {
                    self._consume_channel.nack(message, false, false)
                })
            } else {
                message.properties.headers = increment_headers(message.properties.headers)

                function check_and_republish () {
                    self._worker_pool.acquire((err, channel) => {
                        channel.checkQueue(message.properties.replyTo, (err, ok) => {
                            if (err) {
                                self._worker_pool.remove(channel)

                                // If we got a proper queue error then the queue must
                                // just not be around.
                                if (err.message.substr(0, 16) === 'Operation failed') {
                                    self.__use_consume_channel(() => {
                                        self._consume_channel.nack(message, false, false)
                                    })
                                } else {
                                    check_and_republish()
                                }
                            } else {
                                self._worker_pool.release(channel)

                                self.__use_publish_channel(() => {
                                    self._publish_channel.publish('', message.properties.replyTo, message.content, message.properties)
                                })

                                self.__use_consume_channel(() => {
                                    self._consume_channel.ack(message)
                                })
                            }
                        })
                    })
                }

                check_and_republish()
            }

            if (self.on_error) {
                self.on_error(e)
            } else {
                throw e
            }
        }
    }
}






Remit.prototype.__on_result = function __on_result (message) {
    const self = this

    const callback = self._results_callbacks[message.properties.correlationId]

    let data = JSON.parse(message.content.toString())
    if (!Array.isArray(data)) data = [data]

    delete self._results_timeouts[message.properties.correlationId]

    // If it turns out we don't have a callback here (this can
    // happen if the timeout manages to get there first) then
    // let's exit before we get ourselves into trouble.
    if (!callback) {
        return
    }

    try {
        callback.callback.apply(callback.context, data)
    } catch (e) {
        delete self._results_callbacks[message.properties.correlationId]

        if (self.on_error) {
            self.on_error(e)
        } else {
            throw e
        }
    }

    delete self._results_callbacks[message.properties.correlationId]
}






function increment_headers (headers) {
    if (!headers) {
        return {
            attempts: 1
        }
    }

    if (!headers.attempts) {
        headers.attempts = 1

        return headers
    }

    headers.attempts = parseInt(headers.attempts) + 1

    return headers
}






function step_through_callbacks (callbacks, args, extra, done, index) {
    args = args !== undefined ? args : {}
    extra = extra || {}

    if (!index) {
        index = 0

        if (!Array.isArray(callbacks)) {
            return callbacks(args, done, extra)
        }

        if (callbacks.length === 1) {
            return callbacks[index](args, done, extra)
        }

        return callbacks[index](args, (err, args) => {
            if (err) {
                return done(err, args)
            }

            return step_through_callbacks(callbacks, args, extra, done, ++index)
        }, extra)
    }

    if (!callbacks[index]) {
        return done(null, args)
    }

    return callbacks[index](args, (err, args) => {
        if (err) {
            return done(err, args)
        }

        return step_through_callbacks(callbacks, args, extra, done, ++index)
    }, extra)
}
