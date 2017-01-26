const debug = require('debug')('remit:consumeChannel')
const connect = require('./connection')

function getConsumeChannel () {
  const remit = this

  if (remit._consumeChannel) {
    debug('Providing existing consume channel')

    return remit._consumeChannel
  }

  debug('Requesting new consume channel')

  remit._consumeChannel = new Promise((resolve, reject) => {
    connect.apply(remit).then((connection) => {
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

  return remit._consumeChannel
}

module.exports = getConsumeChannel
