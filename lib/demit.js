'use strict'

const _ = require('lodash')
const uuid = require('node-uuid').v4

module.exports = function demit (args, eta) {
    const self = this

    if (_.isString(args)) {
        args = {event: args}
    } else if (!_.isObject(args) || !args.event) {
        self.__emit('error', new Error(`No valid routing given for demit command. First argument should at least provide an endpoint name.`))
    }

    if (Object.prototype.toString.call(eta) !== '[object Date]') {
        self.__emit('error', new Error(`No valid ETA given for demit command.`))
    }

    const data = Array.prototype.slice.call(arguments, 2)

    const options = {
        mandatory: true,
        broadcast: true,
        timestamp: eta.getTime()
    }

    return self.__request(args, data, null, options)
}
