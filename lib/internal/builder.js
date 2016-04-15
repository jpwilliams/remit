'use strict'

module.exports = {
    req: build_request,
    request: build_request,

    res: build_response,
    response: build_response,

    err: build_error,
    error: build_error
}






function build_request (args, data, options) {
    const req = {
        jsonrpc: '2.0',
        method: args.event
    }

    if (options.correlationId) {
        req.id = options.correlationId
    }

    if (data) {
        req.params = data
    }

    console.log(req)

    return new Buffer(JSON.stringify(req))
}






function build_response (args, data, options, error) {
    const res = {
        jsonrpc: '2.0',
        id: options.correlationId || null
    }

    if (error) {
        const parsed_err = {
            message: error.message,
            code: error.code || 500
        }

        if (error.data) {
            parsed_err.data = error.data
        }

        res.error = parsed_err
    } else {
        res.result = data || null
    }

    return new Buffer(JSON.stringify(res))
}






function build_error () {
    return {}
}
