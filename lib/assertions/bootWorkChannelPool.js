const genericPool = require('generic-pool')
const connect = require('./connection')
const debug = require('debug')('remit:workerPool')

function bootChannelPool () {
  const remit = this

  const pool = genericPool.createPool({
    create: () => {
      return new Promise((resolve, reject) => {
        connect.apply(remit).then((connection) => {
          return connection.createChannel()
        }).then((channel) => {
          channel.on('error', (err) => {
            debug(err.message)
          })

          channel.on('close', () => {
            debug('Worker channel closed')
          })

          resolve(channel)
        }).catch(reject)
      })
    },

    destroy: (channel) => {
      return Promise.resolve()
    }
  }, {
    min: 5,
    max: 10
  })

  return pool
}

module.exports = bootChannelPool
