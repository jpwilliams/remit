'use strict'

const EventEmitter = require('eventemitter3')
const uuid = require('node-uuid').v4
const _ = require('lodash')

module.exports = function __request (args, data, callback, options) {
    const self = this

    function send_request () {
        const emitter = new EventEmitter()

        options.appId = self._service_name
        options.type = args.event

        emitter.options = options

        let req_options = _.clone(options)
        let req_data = data || Array.from(arguments)
        let req_args = args

        if (req_options.replyTo) {
            req_options.correlationId = uuid()
            self._waiting_emitters[req_options.correlationId] = emitter
        }

        self.__assert_connection(() => {
            self.__assert_exchange(() => {
                console.log("YES")

                self.__assert_reply_consumption((publish_channel) => {
                    self.__set_timeout(emitter, req_options.timeout)

                    console.log('sdfgiuhsdufgs ::', req_options.correlationId)

                    publish_channel.publish(
                        self._exchange_name,
                        req_args.event,
                        self.__build.request(req_args, req_data, req_options),
                        req_options
                    )

                    emitter.emit('sent')
                })
            })
        })

        return emitter
    }

    if (data || callback) {
        return send_request()
    } else {
        emitter.send = send_request

        return emitter
    }
}
