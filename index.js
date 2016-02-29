'use strict'

const os = require('os')
const uuid = require('node-uuid').v4
const amqplib = require('amqplib')

module.exports = function (opts) {
    return new Remit(opts)
}






function Remit (opts) {
    if (!opts) opts = {}
    
    // Exposed items
    this._service_name = opts.name || ''
    this._url = opts.url || 'amqp://localhost'
    
    // Global items
    this._connection = opts.connection || null
    this._channel = opts.channel || null
    this._exchange = opts.exchange || null
    
    // Callback queues
    this._connection_callbacks = []
    this._exchange_callbacks = []
    
    // Callback trackers
    this._results_callbacks = {}
    this._results_timeouts = {}
    
    // States
    this._consuming_results = false
    this._listener_count = 0
    
    return this
}






Remit.prototype.on_error = null






Remit.prototype.res = function res (event, callback, context, options) {
    const self = this
    
    // Set up default options if we haven't been given any.
    if (!options) {
        options = {}
    }
    
    self.__connect(() => {
        self.__assert_exchange(() => {
            const chosen_queue = options.queueName || event
            
            // TODO Check this for a valid response
            self._channel.assertQueue(chosen_queue, {
                exclusive: false,
                durable: true,
                autoDelete: false
            })
            
            self._channel.bindQueue(chosen_queue, 'remit', event).then(() => {
                self._channel.consume(chosen_queue, (message) => {
                    if (!message.properties.timestamp) {
                        self.__consume_res(message, callback, context)
                    } else {
                        const time_to_wait = parseInt(message.properties.timestamp - new Date().getTime())
                        
                        if (time_to_wait < 0) {
                            self.__consume_res(message, callback, context)
                        } else {
                            setTimeout(() => {
                                self.__consume_res(message, callback, context)
                            }, time_to_wait)
                        }
                    }
                }, {
                    exclusive: false
                })
            }).then(null, console.error)
        })
    })
}






Remit.prototype.req = function req (event, args, callback, options) {
    const self = this
    
    if (!options) {
        options = {}
    }
    
    self.__connect(() => {
        self.__assert_exchange(() => {
            if (!callback) {
                return self._channel.publish('remit', event, new Buffer(JSON.stringify(args || {})), options)
            }
            
            if (!self._consuming_results) {
                self._consuming_results = true
                
                self._channel.consume('amq.rabbitmq.reply-to', function (message) {
                    self.__on_result.apply(self, arguments)
                }, {
                    exclusive: true,
                    noAck: true
                }).then(send_message).then(null, console.warn)
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
                
                self._channel.publish('remit', event, new Buffer(JSON.stringify(args || {})), options)
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
    
    options.queueName = `${event}:emission:${self._service_name}:${++self._listener_count}`
    
    self.res.call(self, event, callback, context, options)
}






Remit.prototype.emit = function emit (event, args, options) {
    const self = this
    
    if (!options) {
        options = {}
    }
    
    options.broadcast = true
    options.autoDeleteCallback = options.ttl ? false : true
    
    self.req.call(self, event, args, options.onResponse, options)
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
    
    self.req.call(self, event, args, options.onResponse, options)
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
    
    self.req(event, args, callback, options)
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
    
    // So let's connect!
    amqplib.connect(self._url).then((connection) => {
        // Everything's go fine, so we'll set this global
        // object to our new connection.
        self._connection = connection
        
        // We now need to make a channel to communicate
        // through.
        self._connection.createChannel().then((channel) => {
            // Everything went awesome. Let's set our new
            // global channel.
            self._channel = channel
            
            // Time to run the callbacks. Let's grab them and
            // take them out of the queue.
            
            // TODO Remove these one at a time as we process
            // them.
            const callbacks = self._connection_callbacks
            self._connection_callbacks = []
            
            // Loop through and make everything happen!
            for (var i = 0; i < callbacks.length; i++) {
                callbacks[i]()
            }
        }).then(null, console.error)
    }).then(null, console.error)
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
    self._channel.assertExchange('remit', 'topic', {
        autoDelete: true
    }).then(() => {
        // Everything went awesome so we'll let everything
        // know that the exchange is up.
        self._exchange = true
        
        // Time to run any callbacks that were waiting on
        // this exchange being made.
        
        // TODO Remove these one at a time as we process
        // them.
        const callbacks = self._exchange_callbacks
        self._exchange_callbacks = []
        
        for (var i = 0; i < callbacks.length; i++) {
            callbacks[i]()
        }
    }).then(null, console.error)
}






Remit.prototype.__consume_res = function __consume_res (message, callback, context) {
    const self = this
    
    let data
    
    try {
        data = JSON.parse(message.content.toString())
    } catch (e) {
        return self._channel.nack(message, false, false)
    }

    if (!message.properties.correlationId || !message.properties.replyTo) {
        try {
            callback.call(context, data, function (err) {
                self._channel.ack(message)
            })
        } catch (e) {
            if (message.properties.headers && message.properties.headers.attempts && message.properties.headers.attempts > 4) {
                self._channel.nack(message, false, false)
            } else {
                message.properties.headers = increment_headers(message.properties.headers)

                self._channel.publish('', message.properties.replyTo, message.content, message.properties)
                self._channel.ack(message)
            }
            
            if (self.on_error) {
                self.on_error(e)
            } else {
                throw e
            }
        }
    } else {
        try {
            callback.call(context, data, function (err, data) {
                const options = {correlationId: message.properties.correlationId}

                self._channel.publish('', message.properties.replyTo, new Buffer(JSON.stringify(Array.prototype.slice.call(arguments))), options)
                self._channel.ack(message)
            })
        } catch (e) {
            if (message.properties.headers && message.properties.headers.attempts && message.properties.headers.attempts > 4) {
                self._channel.nack(message, false, false)
            } else {
                message.properties.headers = increment_headers(message.properties.headers)
                self._channel.publish('', message.properties.replyTo, message.content, message.properties)
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






Remit.prototype.__on_result = function __on_result (message) {
    const self = this
    
    const callback = self._results_callbacks[message.properties.correlationId]
    
    let data = JSON.parse(message.content.toString())
    if (!Array.isArray(data)) data = [data]
    
    delete self._results_timeouts[message.properties.correlationId]
    
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