const url = require('url')

function parseUrl (input) {
  let parsedUrl = url.parse(input, true)

  if (parsedUrl.protocol) {
    if (parsedUrl.protocol !== 'amqp:') {
      throw new Error('Incorrect protocol')
    }
  } else {
    if (parsedUrl.path && !parsedUrl.host) {
      parsedUrl.host = parsedUrl.path
      parsedUrl.path = null
      parsedUrl.pathname = null
    }

    parsedUrl.protocol = 'amqp:'
    parsedUrl.slashes = true
  }

  // Overwrite query parameters, as we don't want to allow
  // any outside specification.
  parsedUrl.query = {
    frameMax: '0x1000', // 4,096 (4kb)
    heartbeat: '15' // Frequent hearbeat
  }

  // `search` overwrites `query` if defined
  parsedUrl.search = ''

  return url.format(parsedUrl)
}

module.exports = parseUrl
