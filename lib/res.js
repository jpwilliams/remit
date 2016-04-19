'use strict'

const _ = require('lodash')

module.exports = function res (args, callback) {
    const self = this

    if (_.isString(args)) {
        args = {event: args}
    } else if (!_.isObject(args) || !args.event) {
        self.__emit('error', new Error(`No valid routing given for res command. First argument should at least provide an endpoint name.`))
    }

    const options = {}

    return self.__response(args, callback, options)
}
