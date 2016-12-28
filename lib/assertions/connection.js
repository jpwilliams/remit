const debug = require('debug')('remit:connection')
const amqpLib = require('amqplib')
const packageJson = require('../../package.json')
let connection = null

function connect (remitName, remitUrl) {
  if (connection) {
    debug('Providing existing connection')

    return connection
  }


  debug('Creating new connection to', remitUrl)

  connection = amqpLib.connect(remitUrl, {
    clientProperties: {
      connection_name: name,
      powered: `${packageJson.name}@${packageJson.version}`,
      repository: 'https://github.com/jpwilliams/remit',
      package: 'https://www.npmjs.com/package/remit'
    }
  })

  connection.then((con) => {
    debug('Connected to AMQP')

    con.on('close', () => {
      connection = null
    })
  })

  return connection
}

module.exports = connect
