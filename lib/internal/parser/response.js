'use strict'

function __response_parser () {
    let func = function __parse_response (message) {
        return {}
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