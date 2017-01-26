// Get requirements
const debug = require('debug')('remit:connection')
const amqplib = require('amqplib')
const packageJson = require('../../package.json')
const parseUrl = require('../utils/parseUrl')

// Function to export. Whenever something needs
// a connection, it runs this.
function connect (options) {
  const remit = this

  // If we already have an existing connection
  // or, at least, a connection has already been
  // requested elsewhere, return that.
  if (remit._connection) {
    debug('Providing existing connection')

    return remit._connection
  }

  // Parse whatever URL we've been given
  const remitUrl = parseUrl(options.url)

  debug('Creating new connection to', remitUrl)

  // Set up some connection options (provides some
  // prettiness for RabbitMQ when viewing the
  // connection in the Management plugin.
  const connectionOptions = {
    clientProperties: {
      connection_name: options.name,
      powered_by: `${packageJson.name}@${packageJson.version} (${packageJson.repository.url.substr(0, packageJson.repository.url.length - 4)}/tree/${packageJson.version})`,
      repository: packageJson.repository.url,
      package: `https://www.npmjs.com/package/${packageJson.name}`
    }
  }

  // Let's set up the promise that'll connect to the
  // AMQ for us.
  remit._connection = new Promise((resolve, reject) => {
    // Scope some variables up here for later use
    let disposableChannel
    let returnedConnection

    // Connect!
    amqplib.connect(remitUrl, connectionOptions).then((con) => {
      debug('Connected to the AMQ')

      returnedConnection = con

      // Once we've connected, we need to assert that
      // the right exchange exists too.
      // We'll use a dispoable new channel for this task.
      // Basically everything needs an exchange, so we wait
      // for it to be asserted before resolving this promise.
      return con.createChannel()
    }).then((newChannel) => {
      debug(`Asserting "${options.exchange}" exchange`)

      disposableChannel = newChannel

      // Assert exchange!
      return disposableChannel.assertExchange(options.exchange, 'topic', {
        durable: true,
        internal: false,
        autoDelete: true
      })
    }).then((ok) => {
      debug(`Asserted "${options.exchange}" exchange`)

      // Once everything's sorted, close our disposable
      // channel to clear up.
      return disposableChannel.close()
    }).then(() => {
      // And we're done! Resolve!
      return resolve(returnedConnection)
    }).catch((err) => {
      // If anything went wrong, just reject the hell out
      // of it.
      return reject(err)
    })
  })

  // Return the generated promise!
  // Sorted.
  return remit._connection
}

module.exports = connect
