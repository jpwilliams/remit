var debug = require('debug')('remit:response')
var EventEmitter = require('eventemitter3')
var _ = require('lodash')

module.exports = function (options) {
    return new response(options)
}

function response (master_options) {
    var ret = function response (args, callback) {
        debug('Making new response')

        if (_.isString(args)) {
            args = {event: args}
        } else if (!_.isObject(args) || !args.event) {
            throw new Error('No valid rotuing given for request. First argument should at least provide an endpoint name.')
        }
        
        var options = _.assign({}, master_options ? master_options.options || {} : {})
        
        if (master_options && master_options.unique_queue) {
            this._entities.emitters[args.event] = this._entities.emitters[args.event] || 0
            options.queueName = '' + args.event + ':emit:' + this._service_name + ':' + ++this._entities.emitters[args.event]
        }

        return this.__receive(null, args, callback, options, master_options)
    }
    
    ret.__events = new EventEmitter()
    
    ret.data = function data (callback) {
        ret.__events.on('data', callback)
        
        return ret
    }
    
    return ret
}
