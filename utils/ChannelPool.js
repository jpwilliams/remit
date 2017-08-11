const genericPool = require('generic-pool')

function ChannelPool (connection) {
  return genericPool.createPool({
    create: async () => {
      const con = await connection
      const channel = await con.createChannel()
      channel.on('error', err => console.error(err))
      channel.on('close', () => console.log('Worker channel closed'))

      return channel
    },

    destroy: channel => channel.close()
  }, {
    min: 5,
    max: 10
  })
}

module.exports = ChannelPool
