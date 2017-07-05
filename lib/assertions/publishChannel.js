const debug = require('debug')('remit:publishChannel')
const connect = require('./connection')

function getPublishChannel () {
  const remit = this

  debug('Requesting new publish channel')

  return new Promise((resolve, reject) => {
    connect.apply(remit).then((connection) => {
      debug('Creating new publish channel')

      return connection.createChannel()
    }).then((channel) => {
      debug('Created publish channel')

      channel.prefetch(49)

      return resolve(channel)
    }).catch((err) => {
      return reject(err)
    })
  })
}

module.exports = getPublishChannel
