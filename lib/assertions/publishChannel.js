const debug = require('debug')('remit:publishChannel')
const connect = require('./connection')
let publishChannel = null

function getPublishChannel () {
  if (publishChannel) {
    debug('Providing existing publish channel')

    return publishChannel
  }

  debug('Requesting new publish channel')

  publishChannel = new Promise((resolve, reject) => {
    connect().then((connection) => {
      debug('Creating new publish channel')

      return connection.createChannel()
    }).then((channel) => {
      debug('Created publish channel')

      return resolve(channel)
    }).catch((err) => {
      return reject(err)
    })
  })

  return publishChannel
}

module.exports = getPublishChannel
