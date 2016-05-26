'use strict'

const debug = require('debug')('remit:send')
const EventEmitter = require('eventemitter3')
const uuid = require('node-uuid').v4
const _ = require('lodash')

module.exports = __send

function __send (skeleton, args, data, callback, options) {
    const self = this
    
    const id = uuid()

    let ret = function __send_message () {
        const new_data = Array.from(arguments)
        const have_new_data = !!new_data.length

        const new_request = __send.apply(self, [ret])

        self.__assert('connection', (connection) => {
            self.__assert('exchange', (exchange) => {
                self.__assert('reply', new_request, (publish_channel) => {
                    // self.__set_timeout(new_request, 5000)
                    
                    publish_channel.publish(
                        self._exchange_name,
                        args.event,
                        self.__parser.request.build(args, have_new_data ? new_data : data, new_request.options),
                        new_request.options
                    )
                    
                    const headers = {
                        correlation_id: new_request.options.correlationId,
                        reply_to: new_request.options.replyTo
                    }

                    self.request.__events.emit.apply(self.request.__events, ['sent', headers])
                    new_request.__events.emit.apply(new_request, ['sent', headers])
                })
            })
        })

        return new_request
    }

    ret.id = uuid()
    ret.send = ret
    ret.__events = new EventEmitter()
    ret.removeListener = ret.__events.removeListener

    ret.data = function data (callback) {        
        ret.__events.once.apply(ret, ['data', callback])

        return ret
    }
    
    ret.__incoming = function (message) {
        const data = self.__parser.response(message)
        const args = ['data'].concat(data.data)
        
        self.request.__events.emit.apply(self.request.__events, args)
        ret.__events.emit.apply(ret, args)
    }

    ret.options = (skeleton ? _.cloneDeep(skeleton.options || {}) : false) || options || {}

    if (ret.options.replyTo) {
        ret.options.correlationId = ret.id
    }

    debug(`Set up new message to send ${ret.id}`)

    if (skeleton && skeleton._events) {
        debug(`${ret.id} is copy of another message skeleton. Copying events.`)

        Object.keys(skeleton._events).forEach((event) => {
            const listeners = skeleton.__events.listeners.apply(skeleton, [event])

            listeners.forEach((listener) => {
                ret.__events.once.apply(ret, [event, listener])
            })
        })
    }
    
    if (callback) {
        ret.data(callback)
    }

    return ret
}
