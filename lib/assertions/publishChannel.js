const debug = require('debug')('remit:publishChannel')
const connect = require('./connection')

function getPublishChannel () {
  const remit = this

  if (remit._publishChannel) {
    debug('Providing existing publish channel')

    return remit._publishChannel
  }

  debug('Requesting new publish channel')

  remit._publishChannel = new Promise((resolve, reject) => {
    connect.apply(remit).then((connection) => {
      debug('Creating new publish channel')

      return connection.createChannel()
    }).then((channel) => {
      debug('Created publish channel')

      channel.prefetch(48)

      return resolve(channel)
    }).catch((err) => {
      return reject(err)
    })
  })

  return remit._publishChannel
}

module.exports = getPublishChannel
