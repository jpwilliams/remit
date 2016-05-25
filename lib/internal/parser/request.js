'use strict'

const debug = require('debug')('remit:parser:request')

function __request_parser () {
    let func = function __parse_request (message) {
        let content
        let ret = {headers: {}, data: null}

        try {
            content = JSON.parse(message.content.toString())
        } catch (e) {
            ret.error = {
                code: -32700,
                message: 'Invalid JSON received.'
            }
        }

        if (content.jsonrpc !== '2.0') {
            ret.error = {
                code: -32600,
                message: 'The JSON received is not a valid Request object.'
            }
        }

        if (content.id) {
            if (message.properties.correlationId !== content.id) {
                ret.error = {
                    code: -32600,
                    message: 'The JSON received is not a valid Request object as correlation IDs did not match.'
                }
            }

            ret.headers.correlation_id = content.id

            if (message.properties.replyTo) {
                ret.headers.reply_to = message.properties.replyTo
            }
        }

        if (content.params) {
            ret.data = content.params
        }

        return ret
    }

    func.build = function __build_request (args, data, options) {
        let request = {
            jsonrpc: '2.0'
        }

        if (!args || !args.event) {
            console.error('No event to build request around')

            return false
        }

        request.method = args.event
        
        if (options && options.correlationId) {
            request.id = options.correlationId
        }

        if (data) {
            request.params = Array.isArray(data) ? data : [data]
        }

        return new Buffer(JSON.stringify(request))
    }

    return func
}

module.exports = __request_parser()