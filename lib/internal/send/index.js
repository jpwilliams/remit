var debug = require('debug')('remit:send')
var EventEmitter = require('eventemitter3')
var uuid = require('node-uuid').v4
var _ = require('lodash')

module.exports = __send

function __send (skeleton, args, data, callback, options) {
    var self = this
    
    var id = uuid()

    var ret = function __send_message () {
        var new_data = Array.from(arguments)
        var have_new_data = !!new_data.length

        var new_request = __send.apply(self, [ret])

        self.__assert('connection', function (connection) {
            self.__assert('exchange', function (exchange) {
                var send = function (publish_channel) {
                    // self.__set_timeout(new_request, 5000)
                    
                    publish_channel.publish(
                        self._exchange_name,
                        args.event,
                        self.__parser.request.build(args, have_new_data ? new_data : data, new_request.options),
                        new_request.options
                    )
                    
                    var headers = {
                        correlation_id: new_request.options.correlationId,
                        reply_to: new_request.options.replyTo
                    }

                    self.request.__events.emit.apply(self.request.__events, ['sent', headers])
                    new_request.__events.emit.apply(new_request, ['sent', headers])
                }

                if (options.replyTo) {
                    self.__assert('reply', new_request, send)
                } else {
                    self.__assert('publish', send)
                }
            })
        })

        return new_request
    }

    ret.id = uuid()
    ret.send = ret
    ret.__events = new EventEmitter()
    ret.removeListener = ret.__events.removeListener

    ret.data = function data (callback) {        
        ret.__events.once.apply(ret, ['data', callback])

        return ret
    }
    
    ret.sent = function sent (callback) {
        ret.__events.once.apply(ret, ['sent', callback])
        
        return ret
    }
    
    ret.__incoming = function (message) {
        var data = self.__parser.response(message)
        var args = ['data'].concat(data.data)
        
        self.request.__events.emit.apply(self.request.__events, args)
        ret.__events.emit.apply(ret, args)
    }

    ret.options = (skeleton ? _.cloneDeep(skeleton.options || {}) : false) || options || {}

    if (ret.options.replyTo) {
        ret.options.correlationId = ret.id
    }

    debug('Set up new message to send ' + ret.id)

    if (skeleton && skeleton._events) {
        debug('' + ret.id + ' is copy of another message skeleton. Copying events.')

        Object.keys(skeleton._events).forEach(function (event) {
            var listeners = skeleton.__events.listeners.apply(skeleton, [event])

            listeners.forEach(function (listener) {
                ret.__events.once.apply(ret, [event, listener])
            })
        })
    }
    
    if (callback) {
        ret.data(callback)
    }

    return ret
}
