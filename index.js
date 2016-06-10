'use strict'

const os = require('os')
const uuid = require('node-uuid').v4
const trace = require('stack-trace')
const amqplib = require('amqplib/callback_api')

module.exports = function (opts) {
    return new Remit(opts)
}






function Remit (opts) {
    if (!opts) opts = {}

    // Exposed items
    this._service_name = opts.name || ''
    this._url = opts.url || 'amqp://localhost'
    this._trace = opts.trace === false ? false : true
    this._exchange_name = opts.exchange || 'remit'

    // Global items
    this._connection = opts.connection || null
    this._consume_channel = null
    this._publish_channel = null
    this._work_channel = null
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

    return this
}






Remit.prototype.on_error = null
Remit.prototype.version = require('./package.json').version






Remit.prototype.res = function res (event, callbacks, context, options) {
    const self = this

    // Set up default options if we haven't been given any.
    if (!options) {
        options = {}
    }

    self.__connect(() => {
        self.__assert_exchange(() => {
            const chosen_queue = options.queueName || event

            self.__use_consume_channel(() => {
                // TODO Check this for a valid response
                self._consume_channel.assertQueue(chosen_queue, {
                    exclusive: false,
                    durable: true,
                    autoDelete: false
                })
            })

            self.__use_consume_channel(() => {
                self._consume_channel.bindQueue(chosen_queue, self._exchange_name, event, {}, (err, ok) => {
                    if (err) {
                        console.error(err)
                    }

                    self._consume_channel.consume(chosen_queue, (message) => {
                        if (!message.properties.timestamp) {
                            self.__consume_res(message, callbacks, context)
                        } else {
                            const time_to_wait = parseInt(message.properties.timestamp - new Date().getTime())

                            if (time_to_wait <= 0) {
                                self.__consume_res(message, callbacks, context)
                            } else {
                                setTimeout(() => {
                                    self.__consume_res(message, callbacks, context)
                                }, time_to_wait)
                            }
                        }
                    }, {
                        exclusive: false
                    })
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
                self._consume_channel = null
                self.__use_consume_channel()
            })

            channel.on('close', () => {
                self._consume_channel = null
                self.__use_consume_channel()
            })

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
                self._publish_channel = null
                self.__use_publish_channel()
            })

            channel.on('close', () => {
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






Remit.prototype.__use_work_channel = function __use_work_channel (callback) {
    const self = this

    if (!callback) {
        callback = function () {}
    }

    if (self._work_channel) {
        if (self._work_channel_callbacks.length) {
            self._work_channel_callbacks.push(callback)

            return
        }

        return callback()
    }

    const first = !self._work_channel_callbacks.length
    self._work_channel_callbacks.push(callback)

    if (!first) {
        return
    }

    self.__connect(() => {
        self._connection.createChannel((err, channel) => {
            channel.on('error', (err) => {
                self._work_channel = null
                self.__use_work_channel()
            })

            channel.on('close', () => {
                self._work_channel = null
                self.__use_work_channel()
            })

            self._work_channel = channel

            // Loop through and make everything happen!
            while (self._work_channel_callbacks.length > 0) {
                self._work_channel_callbacks[0]()
                self._work_channel_callbacks.shift()
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
    self.__use_work_channel(() => {
        self._work_channel.assertExchange(self._exchange_name, 'topic', {
            autoDelete: true
        }, (err, ok) => {
            if (err) {
                console.error(err)
            }

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






Remit.prototype.__consume_res = function __consume_res (message, callbacks, context) {
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
        caller: message.properties.messageId
    }

    if (!message.properties.correlationId || !message.properties.replyTo) {
        function done (err, data) {
            self.__use_consume_channel(() => {
                self._consume_channel.ack(message)
            })
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

                function check_and_republish() {
                    self.__use_work_channel(() => {
                        self._work_channel.checkQueue(message.properties.replyTo, (err, ok) => {
                            if (err) {
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
    } else {
        function done (err, data) {
            const options = {correlationId: message.properties.correlationId}
            const res_data = new Buffer(JSON.stringify(Array.prototype.slice.call(arguments)))

            function check_and_publish () {
                self.__use_work_channel(() => {
                    self._work_channel.checkQueue(message.properties.replyTo, (err, ok) => {
                        if (err) {
                            // If we got a proper queue error then the queue must
                            // just not be around.
                            if (err.message.substr(0, 16) === 'Operation failed') {
                                self.__use_consume_channel(() => {
                                    self._consume_channel.nack(message, false, false)
                                })
                            } else {
                                check_and_publish()
                            }
                        } else {
                            self.__use_publish_channel(() => {
                                self._publish_channel.publish('', message.properties.replyTo, res_data, options)
                            })

                            self.__use_consume_channel(() => {
                                self._consume_channel.ack(message)
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
                    self.__use_work_channel(() => {
                        self._work_channel.checkQueue(message.properties.replyTo, (err, ok) => {
                            if (err) {
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






function step_through_callbacks(callbacks, args, extra, done) {
    args = args || {}
    extra = extra || {}

    callbacks = Array.isArray(callbacks) ? Array.from(callbacks) : [callbacks]

    let callback = callbacks.shift()

    if (typeof callback !== 'function') {
        throw new Error('Callback is not a function')
    }

    return callback(args, (err, args) => {
        if (err) {
            return done(err, args)
        }

        if (callbacks.length === 0) {
            return done(null, args)
        }

        return step_through_callbacks(callbacks, args, extra, done)
    }, extra)
}
