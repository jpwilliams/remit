function __responseParser () {
  var func = function __parseResponse (message) {
    var content
    var ret = {headers: {}, data: null}

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

  func.build = function __buildResponse (data, args, error) {
    var response = {
      jsonrpc: '2.0',
      id: data.headers.correlation_id || null
    }

    if (error) {
      var parsedError = {
        message: error.message,
        code: error.code || 500
      }

      if (error.data) {
        parsedError.data = error.data
      }

      response.error = parsedError
    } else {
      response.result = args || null
    }

    return new Buffer(JSON.stringify(response))
  }

  return func
}

module.exports = __responseParser()
