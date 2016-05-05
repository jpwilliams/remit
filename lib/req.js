'use strict'

const _ = require('lodash')

module.exports = function req (args) {
    const self = this

    if (_.isString(args)) {
        args = {event: args}
    } else if (!_.isObject(args) || !args.event) {
        self.__emit('error', new Error(`No valid routing given for req command. First argument should at least provide an endpoint name.`))
    }

    const extra_params = Array.prototype.slice.call(arguments, 1)
    let data
    let callback

    if (extra_params.length) {
        Array.from(extra_params).forEach((param) => {
            if (callback) {
                self.__emit('error', new Error(`Can't send a function as data in req.`))
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

    const options = {
        mandatory: true,
        replyTo: 'amq.rabbitmq.reply-to',
        timeout: parseInt(args.timeout) || 5000
    }

    return self.__request(args, data, callback, options)
}
