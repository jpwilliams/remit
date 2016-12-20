const debug = require('debug')('remit:consumeChannel')
const connect = require('./connection')
let consumeChannel = null

function getConsumeChannel () {
  if (consumeChannel) {
    debug('Providing existing consume channel')

    return consumeChannel
  }

  debug('Requesting new consume channel')

  consumeChannel = new Promise((resolve, reject) => {
    connect().then((connection) => {
      debug('Creating new consume channel')

      return connection.createChannel()
    }).then((channel) => {
      debug('Created consume channel')

      channel.prefetch(128)

      return resolve(channel)
    }).catch((err) => {
      return reject(err)
    })
  })

  return consumeChannel
}

module.exports = getConsumeChannel
