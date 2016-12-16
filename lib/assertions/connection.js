const debug = require('debug')('remit:connection')
const amqpLib = require('amqplib')
let connection = null

function connect () {
  if (connection) {
    debug('Providing existing connection')

    return connection
  }

  debug('Creating new connection')

  connection = amqpLib.connect('amqp://localhost', {})

  connection.then((con) => {
    debug('Connected to AMQP')

    con.on('close', () => {
      connection = null
    })
  })

  return connection
}

module.exports = connect
