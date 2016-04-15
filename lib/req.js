'use strict'

const _ = require('lodash')
const uuid = require('node-uuid').v4

module.exports = function req (args, data, callback) {
    const self = this

    if (_.isString(args)) {
        args = {event: args}
    } else if (!_.isObject(args) || !args.event) {
        self.__emit('error', new Error(`No valid routing given for req command. First argument should at least provide an endpoint name.`))
    }

    if (_.isFunction(data)) {
        if (_.isFunction(callback)) {
            self.__emit('error', new Error(`Can't send a function as data in req.`))
        }

        callback = data
        data = null
    } else if (!_.isObject(data)) {
        data = null
    }

    if (!callback) {
        self.__emit('error', new Error(`Cannot use req with no callback; use emit instead.`))
    }

    const options = {
        mandatory: true,
        replyTo: 'amq.rabbitmq.reply-to',
        correlationId: uuid(),
        timeout: parseInt(args.timeout) || 5000
    }

    return self.__request(args, data, callback, options)
}
