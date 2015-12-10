'use strict'

const master_debug = require('debug')
const uuid = require('node-uuid').v4
const amqplib = require('amqplib/callback_api')
const os = require('os')

module.exports = function (opts) {
    return new Remit(opts)
}






function Remit (opts) {
    if (!opts) opts = {}

    this._service_name = opts.name || ''
    this._url = opts.url || 'amqp://localhost'

    this._connection = opts.connection || null
    this._connection_callbacks = []
    this._channel = opts.channel || null
    this._emit_on_error = opts.emit_on_error || null

    this._exchange = null
    this._exchange_name = 'remit'
    this._exchange_callbacks = []

    this._results_queue = null
    this._results_name = null
    this._results_callback = {}
    this._results_timeouts = {}
    this._results_callbacks = []

    this._listener_count = 0

    this._events = {}

    return this
}






Remit.prototype.on_error = null






Remit.prototype.res = function res (event, callback, context, options) {
    const debug = master_debug('remit.res')

    if (this._events[event]) return false
    if (!options) options = {}

    debug(`Creating "${event}" endpoint`)

    const self = this

    self.__connect(() => {
        self.__assert_exchange(() => {
            const chosen_queue = options.queueName || event

            self._channel.assertQueue(chosen_queue, {
                exclusive: false,
                durable: true,
                autoDelete: false
            })

            self._channel.bindQueue(chosen_queue, 'remit', event, {}, (err, ok) => {
                if (err) throw new Error(err)

                self._channel.consume(chosen_queue, (message) => {
                    debug(`New message`)

                    if (!message.properties.timestamp) {
                        debug('No timestamp; processing message now')
                        self.__consume_res(message, callback, context)
                    } else {
                        debug('Timestamp found')
                        const time_to_wait = parseInt(message.properties.timestamp) - new Date().getTime()

                        if (time_to_wait < 0) {
                            debug('Timestamp obsolete; processing message now')
                            self.__consume_res(message, callback, context)
                        } else {
                            debug(`Processing message in ${time_to_wait}ms`)

                            setTimeout(() => {
                                debug(`Processing message after waiting for ${time_to_wait}ms...`)

                                self.__consume_res(message, callback, context)
                            }, time_to_wait)
                        }
                    }
                }, {
                    exclusive: false
                })
            })
        })
    })
}






Remit.prototype.treq = function reqt (event, args, callback, options) {
    const debug = master_debug('remit.treq')

    const self = this

    if (!options) options = {}
    if (!options.expiration) options.expiration = 5000
    if (!options.timeout) options.timeout = 5000

    self.req(event, args, callback, options)
}






Remit.prototype.req = function req (event, args, callback, options) {
    const debug = master_debug('remit.req')

    if (!options) options = {}

    const self = this
    const correlation_id = uuid()

    self.__connect(() => {
        self.__assert_exchange(() => {
            if (!callback) {
                debug(`No callback specified for req; publishing "${event}" message now`)
                debug(options)

                return self._channel.publish('remit', event, new Buffer(JSON.stringify(args || {})), options)
            }

            self._results_name = `${this._service_name}:callback:${os.hostname()}:${process.pid}`

            self._channel.assertQueue(self._results_name, {
                exclusive: false,
                durable: false,
                autoDelete: true
            })

            self._channel.bindQueue(self._results_name, 'remit', self._results_name, {}, (err, ok) => {
                if (err) throw new Error(err)

                if (!self._results_queue) {
                    self._results_queue = true

                    self._channel.consume(self._results_name, function (message) {
                        self.__on_result.apply(self, arguments)
                    })
                }

                self._results_callback[correlation_id] = {
                    callback: callback,
                    context: null,
                    autoDeleteCallback: true
                }

                options.mandatory = true
                options.replyTo = self._results_name,
                options.correlationId = correlation_id

                self._results_timeouts[correlation_id] = setTimeout(function () {
                    if (!self._results_callback[correlation_id]) return

                    delete self._results_callback[correlation_id]
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

                self._channel.publish('remit', event, new Buffer(JSON.stringify(args || {})), options)
            })
        })
    })

    return correlation_id
}






Remit.prototype.emit = function emit (event, args, options) {
    const debug = master_debug('remit.emit')

    const self = this
    if (!options) options = {}

    options.broadcast = true
    options.autoDeleteCallback = options.ttl ? false : true

    debug('Emitting ', args)

    self.req.call(self, event, args, options.onResponse, options)
}






Remit.prototype.demit = function demit (event, delay, args, options) {
    const debug = master_debug('remit.demit')

    const self = this
    if (!options) options = {}

    options.broadcast = true
    if (Object.prototype.toString.call(delay) === '[object Date]') options.timestamp = delay.getTime()
    options.autoDeleteCallback = options.ttl ? false : true

    debug ('Demitting ', args)

    self.req.call(self, event, args, options.onResponse, options)
}






Remit.prototype.listen = function listen (event, callback, context, options) {
    const self = this

    if (!self._service_name) throw new Error('Must provide a service name if listening')
    if (!options) options = {}

    options.queueName = `${event}:emission:${self._service_name}:${++self._listener_count}`

    self.res.call(self, event, callback, context, options)
}






Remit.prototype.__connect = function __connect (callback) {
    const debug = master_debug('remit.__connect')

    debug(`Checking connection`)

    const self = this

    if (!callback) callback = function () {}
    
    if (self._connection) {
        if (self._connection_callbacks.length) {
            self._connection_callbacks.push(callback)

            return true
        }

        debug(`Instantly hitting callback`)

        return callback(self.connection)
    }

    const first = !self._connection_callbacks.length
    self._connection_callbacks.push(callback)

    if (!first) return

    debug(`Connection not yet made; attemtping now...`)

    amqplib.connect(self._url, (err, con) => {
        if (err) throw new Error(err)

        debug(`Connected to ${self._url}`)

        self._connection = con

        self._connection.createChannel((err, channel) => {
            if (err) throw new Error(err)

            debug(`Channel created`)

            self._channel = channel

            const callbacks = self._connection_callbacks
            self._connection_callbacks = []

            debug(`Running ${callbacks.length} callbacks`)

            for (var i = 0; i < callbacks.length; i++) {
                callbacks[i](self._connection)
            }
        })
    })
}






Remit.prototype.__assert_exchange = function __assert_exchange (callback) {
    const self = this

    const debug = master_debug('remit.__assert_exchange')

    if (!callback) callback = function () {}

    if (self._exchange) {
        if (self._exchange_callbacks.length) {
            self._exchange_callbacks.push(callback)

            return true
        }

        debug(`Instantly hitting exchange callback`)

        return callback()
    }

    self._exchange_callbacks.push(callback)

    self._channel.assertExchange('remit', 'topic', {
        autoDelete: true
    }, (err, ok) => {
        if (err) throw new Error(err)

        self._exchange = true

        const callbacks = self._exchange_callbacks
        self._exchange_callbacks = []

        for (var i = 0; i < callbacks.length; i++) {
            callbacks[i]()
        }
    })
}






Remit.prototype.__on_result = function __on_result (message) {
    const self = this
    const debug = master_debug('remit.__on_result')

    if (!self._results_callback[message.properties.correlationId]) {
        // If we've got it when we don't need it, we'll at least `nack` it first
        return self._channel.nack(message, false, false)
    }

    const callback = self._results_callback[message.properties.correlationId]
    let args = []

    debug(`Got result`, JSON.parse(message.content.toString()))

    let data = JSON.parse(message.content.toString())
    if (!Array.isArray(data)) data = [data]

    delete self._results_timeouts[message.properties.correlationId]

    try {
        callback.callback.apply(callback.context, data)
    } catch (e) {
        self._channel.nack(message, false, false)
        delete self._results_callback[message.properties.correlationId]

        if (self.on_error) {
            self.on_error(e)
        } else {
            throw e
        }
    }

    self._channel.ack(message)
    delete self._results_callback[message.properties.correlationId]
}






Remit.prototype.__consume_res = function __consume_res (message, callback, context) {
    const debug = master_debug('remit.__consume_res')

    const self = this

    let data

    try {
        data = JSON.parse(message.content.toString())
    } catch (e) {
        debug(`Failed to parse JSON data; NACKing`)

        return self._channel.nack(message, false, false)
    }

    debug(`Parsed JSON data`)

    if (!message.properties.correlationId || !message.properties.replyTo) {
        debug(`No callback found; acting as listener`)

        try {
            callback(data)
            self._channel.ack(message)
        } catch (e) {
            if (message.properties.headers && message.properties.headers.attempts && message.properties.headers.attempts > 4) {
                self._channel.nack(message, false, false)
            } else {
                message.properties.headers = increment_headers(message.properties.headers)
                self._channel.publish(message.fields.exchange, message.fields.routingKey, message.content, message.properties)
                self._channel.ack(message)
            }

            if (self.on_error) {
                self.on_error(e)
            } else {
                throw e
            }
        }
    } else {
        debug(`Callback found; aiming to respond`)

        try {
            callback.call(context, data, function (err, data) {
                debug(`Received callback from responder`)

                const options = {correlationId: message.properties.correlationId}

                debug(`Publishing message to ${message.properties.replyTo}`)

                self._channel.publish('remit', message.properties.replyTo, new Buffer(JSON.stringify(Array.prototype.slice.call(arguments))), options)
                self._channel.ack(message)
            })
        } catch (e) {
            debug(`Callback errored`)

            if (message.properties.headers && message.properties.headers.attempts && message.properties.headers.attempts > 4) {
                debug(`Run out of patience. NACKing...`)

                self._channel.nack(message, false, false)
            } else {
                debug(`Giving the message another chance...`)

                message.properties.headers = increment_headers(message.properties.headers)
                self._channel.publish(message.fields.exchange, message.fields.routingKey, message.content, message.properties)
                self._channel.ack(message)
            }

            if (self.on_error) {
                self.on_error(e)
            } else {
                throw e
            }
        }
    }
}






function increment_headers (headers) {
    if (!headers) return {attempts: 1}
    
    if (!headers.attempts) {
        headers.attempts = 1

        return headers
    }

    headers.attempts = parseInt(headers.attempts) + 1

    return headers
}