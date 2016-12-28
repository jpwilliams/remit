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

  parsedUrl.query.frameMax = '0xf000'
  parsedUrl.query.channelMax = '3'

  // `search` overwrites `query` if defined
  parsedUrl.search = ''

  return url.format(parsedUrl)
}

module.exports = parseUrl
