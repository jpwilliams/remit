'use strict'

const _ = require('lodash')

module.exports = function listen (args, callback) {
    const self = this

    if (_.isString(args)) {
        args = {event: args}
    } else if (!_.isObject(args) || !args.event) {
        self.__emit('error', new Error(`No valid routing given for listen command. First argument should at least provide an endpoint name.`))
    }

    const options = {
        queueName: `${args.event}:emission:${self._service_name}:${++self._listener_count}`
    }

    return self.__response(args, callback, options)
}
