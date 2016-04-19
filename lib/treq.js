'use strict'

const _ = require('lodash')
const uuid = require('node-uuid').v4

module.exports = function treq (args) {
    const self = this

    if (_.isString(args)) {
        args = {event: args}
    } else if (!_.isObject(args) || !args.event) {
        self.__emit('error', new Error(`No valid routing given for treq command. First argument should at least provide an endpoint name.`))
    }

    const extra_params = Array.prototype.slice.call(arguments, 1)
    let data = []
    let callback = null

    if (!extra_params.length) {
        data = null
    } else {
        Array.from(extra_params).forEach((param) => {
            if (callback) {
                self.__emit('error', new Error(`Can't send a function as data in treq.`))
            }

            if (_.isFunction(param)) {
                callback = param
            } else {
                data.push(param)
            }
        })
    }

    const options = {
        mandatory: true,
        replyTo: 'amq.rabbitmq.reply-to',
        correlationId: uuid(),
        timeout: parseInt(args.timeout) || 5000
    }

    options.expiration = options.timeout

    return self.__request(args, data, callback, options)
}
