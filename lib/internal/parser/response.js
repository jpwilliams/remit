'use strict'

function __response_parser () {
    let func = function __parse_response (message) {
        let content
        let ret = {headers: {}, data: null}

        try {
            content = JSON.parse(message.content.toString())
        } catch (e) {
            ret.error = {
                code: -32700,
                message: 'Invalid JSON received.'
            }
            
            return ret
        }

        if (content.jsonrpc !== '2.0') {
            ret.error = {
                code: -32600,
                message: 'The JSON received is not a valid Response object.'
            }
            
            return ret
        }
        
        if (!content.id) {
            ret.error = {
                code: -32600,
                message: 'The JSON received is not a valid Response object.'
            }
            
            return ret
        }

        if (message.properties.correlationId !== content.id) {
            ret.error = {
                code: -32600,
                message: 'The JSON received is not a valid Request object as correlation IDs did not match.'
            }
            
            return ret
        }

        ret.headers.correlation_id = content.id

        if (message.properties.replyTo) {
            ret.headers.reply_to = message.properties.replyTo
        }

        if (content.result) {
            ret.data = content.result
        }

        return ret
    }

    func.build = function __build_response (data, args, error) {
        let response = {
            jsonrpc: '2.0',
            id: data.headers.correlation_id || null
        }

        if (error) {
            let parsed_error = {
                message: error.message,
                code: error.code || 500
            }

            if (error.data) {
                parsed_error.data = error.data
            }

            res.error = parsed_error
        } else {
            response.result = args || null
        }

        return new Buffer(JSON.stringify(response))
    }

    return func
}

module.exports = __response_parser()