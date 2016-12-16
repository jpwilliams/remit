const debug = require('debug')('remit:consumeChannel')
const connect = require('./connection')
let consumeChannel = null

function getConsumeChannel () {
  if (consumeChannel) {
    debug('Providing existing consume channel')

    return consumeChannel
  }

  debug('Creating new consume channel')

  consumeChannel = new Promise((resolve, reject) => {
    connect().then((connection) => {
      return connection.createChannel()
    }).then((channel) => {
      debug('Created consume channel')

      return resolve(channel)
    }).catch((err) => {
      return reject(err)
    })
  })

  return consumeChannel
}

module.exports = getConsumeChannel
