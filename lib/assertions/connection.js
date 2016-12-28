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
      connection_name: remitName,
      powered_by: `${packageJson.name}@${packageJson.version} (${packageJson.repository.url.substr(0, packageJson.repository.url.length - 4)}/tree/${packageJson.version})`,
      repository: packageJson.repository.url,
      package: `https://www.npmjs.com/package/${packageJson.name}`
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
