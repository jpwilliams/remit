const debug = require('debug')('remit:workChannel')
const connect = require('./connection')
let workChannel = null

function getWorkChannel () {
  if (workChannel) {
    debug('Providing existing work channel')

    return workChannel
  }

  debug('Requesting new work channel')

  workChannel = new Promise((resolve, reject) => {
    connect().then((connection) => {
      debug('Creating new work channel')

      return connection.createChannel()
    }).then((channel) => {
      debug('Created work channel')

      channel.on('error', (err) => {
        console.error(err)
      })

      channel.on('close', () => {
        workChannel = null

        getWorkChannel()
      })

      return resolve(channel)
    }).catch((err) => {
      return reject(err)
    })
  })

  return workChannel
}

module.exports = getWorkChannel
