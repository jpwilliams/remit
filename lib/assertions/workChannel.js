const debug = require('debug')('remit:workChannel')
const connect = require('./connection')

function getWorkChannel () {
  const remit = this

  if (remit._workChannel) {
    debug('Providing existing work channel')

    return remit._workChannel
  }

  debug('Requesting new work channel')

  remit._workChannel = new Promise((resolve, reject) => {
    connect.apply(remit).then((connection) => {
      debug('Creating new work channel')

      return connection.createChannel()
    }).then((channel) => {
      debug('Created work channel')

      channel.prefetch(128)

      channel.on('error', (err) => {
        console.error(err)
      })

      channel.on('close', () => {
        remit._workChannel = null

        getWorkChannel.apply(remit)
      })

      return resolve(channel)
    }).catch((err) => {
      return reject(err)
    })
  })

  return remit._workChannel
}

module.exports = getWorkChannel
