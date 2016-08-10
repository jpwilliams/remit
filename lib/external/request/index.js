var debug = require('debug')('remit:request')
var EventEmitter = require('eventemitter3')
var _ = require('lodash')

module.exports = function (options) {
    return new request(options)
}

function request (master_options) {
    var self = this
        
    var ret = function request (args) {
        debug('Making new request', master_options, args)

        if (_.isString(args)) {
            args = {event: args}
        } else if (!_.isObject(args) || !args.event) {
            throw new Error('No valid routing given for request. First argument should at least provide an endpoint name.')
        }

        var extra_params = Array.prototype.slice.call(arguments, 1)

        var data
        var callback

        var options = _.assign({
            mandatory: true,
            replyTo: 'amq.rabbitmq.reply-to'
        }, master_options ? master_options.options || {} : {})
        
        if (master_options && !master_options.reply) {
            delete options.replyTo
        }
        
        if (extra_params.length) {
            Array.from(extra_params).forEach(function (param) {
                if (callback) {
                    throw new Error('Can\'t send a function as data in a request.')
                }

                if (_.isFunction(param)) {
                    callback = param
                } else {
                    if (!data) {
                        data = []
                    }

                    data.push(param)
                }
            })
        }

        if (args.transport) {
            options = _.assign(options, args.transport)
        }
        
        debug('Creating new message for ' + args.event)
        var message = this.__send(null, args, data, callback, options)

        if (data || callback) {
            debug('Shorthand used; sending message ' + message.id + ' immediately')

            return message()
        }

        return message
    }
    
    ret.__events = new EventEmitter()
    
    ret.data = function data (callback) {
        ret.__events.on('data', callback)
        
        return ret
    }
    
    ret.sent = function sent (callback) {
        ret.__events.on('sent', callback)
        
        return ret
    }
    
    return ret
}