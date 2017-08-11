const url = require('url')

function parseUrl (input) {
  const parsedUrl = url.parse(input, true)

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
    // Maximum permissible size of a frame (in bytes)
    // to negotiate with clients. Setting to 0 means
    // "unlimited" but will trigger a bug in some QPid
    // clients. Setting a larger value may improve
    // throughput; setting a smaller value may improve
    // latency.
    // I default it to 0x1000, i.e. 4kb, which is the
    // allowed minimum, will fit many purposes, and not
    // chug through Node.JS's buffer pooling.
    //
    // frameMax: '0x20000', // 131,072 (128kb)
    //
    frameMax: '0x1000', // 4,096 (4kb)
    heartbeat: '15' // Frequent hearbeat
  }

  // `search` overwrites `query` if defined
  parsedUrl.search = ''

  return url.format(parsedUrl)
}

module.exports = parseUrl
