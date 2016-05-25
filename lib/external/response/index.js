'use strict'

const debug = require('debug')('remit:response')
const EventEmitter = require('eventemitter3')
const _ = require('lodash')

module.exports = (function () {
    return new response()
})()

function response () {
    let ret = function response (args, callback) {
        debug(`Making new response`)

        if (_.isString(args)) {
            args = {event: args}
        } else if (!_.isObject(args) || !args.event) {
            throw new Error(`No valid rotuing given for request. First argument should at least provide an endpoint name.`)
        }

        return this.__receive(args, callback)
    }
    
    ret.__events = new EventEmitter()
    
    ret.data = function data (callback) {
        ret.__events.on('data', callback)
        
        return ret
    }
    
    return ret
}