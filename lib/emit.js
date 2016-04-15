'use strict'

const _ = require('lodash')
const uuid = require('node-uuid').v4

module.exports = function req (args, data) {
    const self = this

    if (_.isString(args)) {
        args = {event: args}
    } else if (!_.isObject(args) || !args.event) {
        self.__emit('error', new Error(`No valid routing given for emit command. First argument should at least provide an endpoint name.`))
    }

    data = data || null

    const options = {
        mandatory: true,
        broadcast: true
    }

    return self.__request(args, data, null, options)
}
