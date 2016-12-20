const debug = require('debug')('remit:reply')
const getPublishChannel = require('./publishChannel')
let engaged = false

function consumeReplies () {
  const remit = this

  if (engaged) {
    debug('Providing existing reply consumption')

    return engaged
  }

  debug('Requesting reply consumption')

  engaged = new Promise((resolve, reject) => {
    getPublishChannel()
      .then((publishChannel) => {
        debug('Starting to consume new replies')

        return publishChannel.consume('amq.rabbitmq.reply-to', function (message) {
          debug('Consumed a reply', message.properties.correlationId)

          remit._emitter.emit(message.properties.correlationId, ...Array.from(arguments))
        }, {
          noAck: true,
          exclusive: true
        })
      }).then((ok) => {
        debug('Consuming new replies')

        return resolve()
      }).catch((err) => {
        return reject(err)
      })
  })

  return engaged
}

module.exports = consumeReplies
