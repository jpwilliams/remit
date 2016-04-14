'use strict'

const os = require('os')
const uuid = require('node-uuid').v4
const trace = require('stack-trace')
const amqplib = require('amqplib')
const Emitter = require('events').EventEmitter

module.exports = function (opts) {
    const remit = new Emitter()
    remit.__event_emit = remit.emit

    if (!opts) opts = {}

    // Exposed items
    remit._service_name = opts.name || ''
    remit._url = opts.url || 'amqp://localhost'
    remit._trace = opts.trace === false ? false : true
    remit._exchange_name = opts.exchange || 'remit'

    // Global items
    remit._connection = opts.connection || null
    remit._consume_channel = null
    remit._publish_channel = null
    remit._work_channel = null
    remit._exchange = null

    // Callback queues
    remit._connection_callbacks = []
    remit._exchange_callbacks = []
    remit._consume_channel_callbacks = []
    remit._publish_channel_callbacks = []
    remit._work_channel_callbacks = []

    // Callback trackers
    remit._results_emitters = {}
    // remit._results_callbacks = {}
    remit._results_timeouts = {}

    // States
    remit._consuming_results = false
    remit._listener_count = 0

    remit.on_error = null






    remit.res = function res (event, callbacks, context, options, skip_reply) {
        const self = this

        // Set up default options if we haven't been given any.
        if (!options) {
            options = {}
        }

        const emitter = new Emitter()

        self.__connect(() => {
            self.__assert_exchange(() => {
                const chosen_queue = options.queueName || event

                self.__use_consume_channel(() => {
                    // TODO Check this for a valid response
                    self._consume_channel.assertQueue(chosen_queue, {
                        exclusive: false,
                        durable: true,
                        autoDelete: false
                    }).then((queue) => {
                        try {
                            emitter.emit('ready')
                        } catch (e) {
                            self.__event_emit('error', e)
                        }
                    })
                })

                self.__use_consume_channel(() => {
                    self._consume_channel.bindQueue(chosen_queue, self._exchange_name, event).then(() => {
                        self._consume_channel.consume(chosen_queue, (message) => {
                            if (!message.properties.timestamp) {
                                self.__consume_res(message, callbacks, emitter, !!skip_reply)
                            } else {
                                const time_to_wait = parseInt(message.properties.timestamp - new Date().getTime())

                                if (time_to_wait <= 0) {
                                    self.__consume_res(message, callbacks, emitter, !!skip_reply)
                                } else {
                                    setTimeout(() => {
                                        self.__consume_res(message, callbacks, emitter, !!skip_reply)
                                    }, time_to_wait)
                                }
                            }
                        }, {
                            exclusive: false
                        })
                    }).then(null, console.error)
                })
            })
        })

        return emitter
    }






    remit.req = function req (event, args, callback, options, caller) {
        console.log('req hit', event)

        const self = this

        if (!options) {
            options = {}
        }

        if (self._trace) {
            if (!caller) {
                caller = trace.get(remit.req)[0].toString()
            }

            options.appId = self._service_name
            options.messageId = caller
            options.type = event
        }

        const correlation_id = uuid()

        const emitter = self._results_emitters[correlation_id] = new Emitter()
        emitter.broadcast = !!options.broadcast

        emitter.on('closed', function () {
            delete self._results_emitters[correlation_id]
        })

        self.__connect(() => {
            self.__assert_exchange(() => {
                if (callback === false) {
                    console.log('CALLBACK FALSE! JUST SENDING')

                    return self.__use_publish_channel(() => {
                        self._publish_channel.publish(self._exchange_name, event, new Buffer(JSON.stringify(args || {})), options)

                        try {
                            emitter.emit('sent')
                        } catch (e) {
                            emitter.emit('error')
                            self.__event_emit('error', e)
                        }
                    })
                }

                console.log('CALLBACK ::', callback)

                if (!self._consuming_results) {
                    self._consuming_results = true

                    self.__use_publish_channel(() => {
                        self._publish_channel.consume('amq.rabbitmq.reply-to', function (message) {
                            self.__on_result.apply(self, arguments)
                        }, {
                            exclusive: true,
                            noAck: true
                        }).then(send_message).then(null, function (err) {
                            console.warn(err)
                            delete self._results_emitters[correlation_id]
                        })
                    })
                } else {
                    send_message()
                }

                function send_message () {
                    if (callback) {
                        console.log('on reply callback ::', callback)
                        emitter.on('reply', callback)
                    }

                    options.mandatory = true
                    options.replyTo = 'amq.rabbitmq.reply-to'
                    options.correlationId = correlation_id

                    emitter.on('__timeout', (has_route) => {
                        clearTimeout(self._results_timeouts[correlation_id])
                        delete self._results_timeouts[correlation_id]

                        const local_emitter = self._results_emitters[correlation_id]

                        if (!local_emitter) {
                            return
                        }

                        if (local_emitter.got_result) {
                            try {
                                local_emitter.emit('closed')
                            } catch (e) {
                                local_emitter.emit('error', e)
                                self.__event_emit('error', e)
                            }

                            return
                        }

                        const data = {
                            event: event,
                            args: args,
                            options: options,
                            message: has_route ? `Timed out after no response for ${options.timeout || 5000}ms` : `No route found for message.`
                        }

                        try {
                            local_emitter.emit('timeout', data)
                            self.__event_emit('timeout', data)

                            local_emitter.emit('fail', data)
                            self.__event_emit('fail', data)
                        } catch (e) {
                            local_emitter.emit('error', e)
                            self.__event_emit('error', e)
                        }

                        console.log('Oh. Carried on.')

                        try {
                            local_emitter.emit('closed')
                        } catch (e) {
                            local_emitter.emit('error', e)
                            self.__event_emit('error', e)
                        }

                        if (callback) {
                            try {
                                local_emitter.emit('reply', data)
                            } catch (e) {
                                local_emitter.emit('error', e)
                                self.__event_emit('error', e)
                            }
                        }

                        delete self._results_emitters[correlation_id]
                    })

                    self._results_timeouts[correlation_id] = setTimeout(function () {
                        emitter.emit('__timeout', true)
                    }, options.timeout || 5000)

                    self.__use_publish_channel(() => {
                        self._publish_channel.publish(self._exchange_name, event, new Buffer(JSON.stringify(args || {})), options)

                        try {
                            emitter.emit('sent')
                        } catch (e) {
                            emitter.emit('error', e)
                            self.__event_emit('error', e)
                        }
                    })
                }
            })
        })

        return self._results_emitters[correlation_id]
    }






    remit.listen = function listen (event, callback, context, options) {
        const self = this

        if (!self._service_name) {
            throw new Error('Must provide a service name if listening')
        }

        if (!options) {
            options = {}
        }

        options.queueName = `${event}:emission:${self._service_name}:${++self._listener_count}`

        return self.res.call(self, event, callback, context, options, true)
    }






    remit.emit = function emit (event, args, options) {
        const self = this

        if (!options) {
            options = {}
        }

        options.broadcast = true
        options.autoDeleteCallback = options.ttl ? false : true

        let caller

        if (self._trace) {
            caller = trace.get(remit.emit)[0].toString()
        }

        return self.req.call(self, event, args, false, options, caller)
    }






    remit.oreq = function emit (event, args, options) {
        const self = this

        if (!options) {
            options = {}
        }

        options.broadcast = true
        options.autoDeleteCallback = options.ttl ? false : true

        let caller

        if (self._trace) {
            caller = trace.get(remit.oreq)[0].toString()
        }

        return self.req.call(self, event, args, null, options, caller)
    }






    remit.demit = function demit (event, delay, args, options) {
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
            caller = trace.get(remit.demit)[0].toString()
        }

        return self.req.call(self, event, args, options.onResponse, options, caller)
    }






    remit.treq = function treq (event, args, callback, options) {
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
            caller = trace.get(remit.treq)[0].toString()
        }

        return self.req(event, args, callback, options, caller)
    }






    remit.__connect = function __connect (callback) {
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

        // So let's connect!
        // We purposefully don't handle the error here.
        amqplib.connect(self._url).then((connection) => {
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






    remit.__use_consume_channel = function __use_consume_channel (callback) {
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
            self._connection.createChannel().then((channel) => {
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






    remit.__use_publish_channel = function __use_publish_channel (callback) {
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
            self._connection.createChannel().then((channel) => {
                // channel.on('error', (err) => {
                //     console.error(err.message)
                //     console.error(err.stack)
                //
                //     console.log('Channel recovering...')
                //
                //     self._publish_channel = null
                //     self.__use_publish_channel()
                // })
                //
                // channel.on('close', () => {
                //     self._publish_channel = null
                //     self.__use_publish_channel()
                // })

                channel.on('return', (message) => {
                    // console.log('RETURNED ::', msg)
                    const emitter = self._results_emitters[message.properties.correlationId]

                    if (!emitter) {
                        return
                    }

                    emitter.emit('__timeout', false)
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






    remit.__use_work_channel = function __use_work_channel (callback) {
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
            self._connection.createChannel().then((channel) => {
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






    remit.__assert_exchange = function __assert_exchange (callback) {
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
            }).then(() => {
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
            }).then(null, console.error)
        })
    }






    remit.__consume_res = function __consume_res (message, callbacks, emitter, skip_reply) {
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

        if (skip_reply || !message.properties.correlationId || !message.properties.replyTo) {
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
                            self._work_channel.checkQueue(message.properties.replyTo).then(() => {
                                self.__use_publish_channel(() => {
                                    self._publish_channel.publish('', message.properties.replyTo, message.content, message.properties)
                                })

                                self.__use_consume_channel(() => {
                                    self._consume_channel.ack(message)
                                })
                            }).then(null, (err) => {
                                // If we got a proper queue error then the queue must
                                // just not be around.
                                if (err.message.substr(0, 16) === 'Operation failed') {
                                    self.__use_consume_channel(() => {
                                        self._consume_channel.nack(message, false, false)
                                    })
                                } else {
                                    check_and_republish()
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
                        self._work_channel.checkQueue(message.properties.replyTo).then(() => {
                            self.__use_publish_channel(() => {
                                self._publish_channel.publish('', message.properties.replyTo, res_data, options)
                            })

                            self.__use_consume_channel(() => {
                                self._consume_channel.ack(message)
                            })
                        }).then(null, (err) => {
                            // If we got a proper queue error then the queue must
                            // just not be around.
                            if (err.message.substr(0, 16) === 'Operation failed') {
                                self.__use_consume_channel(() => {
                                    self._consume_channel.nack(message, false, false)
                                })
                            } else {
                                check_and_publish()
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
                            self._work_channel.checkQueue(message.properties.replyTo).then(() => {
                                self.__use_publish_channel(() => {
                                    self._publish_channel.publish('', message.properties.replyTo, message.content, message.properties)
                                })

                                self.__use_consume_channel(() => {
                                    self._consume_channel.ack(message)
                                })
                            }).then(null, (err) => {
                                // If we got a proper queue error then the queue must
                                // just not be around.
                                if (err.message.substr(0, 16) === 'Operation failed') {
                                    self.__use_consume_channel(() => {
                                        self._consume_channel.nack(message, false, false)
                                    })
                                } else {
                                    check_and_republish()
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






    remit.__on_result = function __on_result (message) {
        const self = this

        const emitter = self._results_emitters[message.properties.correlationId]

        // If it turns out we don't have a callback here (this can
        // happen if the timeout manages to get there first) then
        // let's exit before we get ourselves into trouble.
        if (!emitter) {
            return
        }

        let data = JSON.parse(message.content.toString())
        if (!Array.isArray(data)) data = [data]

        emitter.got_result = true
        emitter.emit.apply(emitter, ['reply'].concat(data))

        if (!emitter.broadcast) {
            emitter.emit('closed')
        }
    }

    return remit
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
    args = args || {}
    extra = extra || {}

    if (!index) {
        index = 0

        if (!Array.isArray(callbacks)) {
            return callbacks(args, done, extra)
        }

        if (callbacks.length === 1) {
            return callbacks[0](args, done, extra)
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
