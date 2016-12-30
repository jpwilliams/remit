const debug = require('debug')('remit:connection')
const amqplib = require('amqplib')
const packageJson = require('../../package.json')
const parseUrl = require('../utils/parseUrl')
let connection = null

function connect (options) {
  if (connection) {
    debug('Providing existing connection')

    return connection
  }

  const remitUrl = parseUrl(options.url)

  debug('Creating new connection to', remitUrl)

  const connectionOptions = {
    clientProperties: {
      connection_name: options.name,
      powered_by: `${packageJson.name}@${packageJson.version} (${packageJson.repository.url.substr(0, packageJson.repository.url.length - 4)}/tree/${packageJson.version})`,
      repository: packageJson.repository.url,
      package: `https://www.npmjs.com/package/${packageJson.name}`
    }
  }

  connection = new Promise((resolve, reject) => {
    let disposableChannel
    let returnedConnection

    amqplib.connect(remitUrl, connectionOptions).then((con) => {
      debug('Connected to the AMQ')

      returnedConnection = con

      return con.createChannel()
    }).then((newChannel) => {
      debug(`Asserting "${options.exchange}" exchange`)

      disposableChannel = newChannel

      return disposableChannel.assertExchange(options.exchange, 'topic', {
        durable: true,
        internal: false,
        autoDelete: true
      })
    }).then((ok) => {
      debug(`Asserted "${options.exchange}" exchange`)

      return disposableChannel.close()
    }).then(() => {
      return resolve(returnedConnection)
    }).catch((err) => {
      return reject(err)
    })
  })

  return connection
}

module.exports = connect
