const debug = require('debug')('remit:reply')
const getPublishChannel = require('./publishChannel')

function consumeReplies () {
  const remit = this

  if (remit._engaged) {
    debug('Providing existing reply consumption')

    return remit._engaged
  }

  debug('Requesting reply consumption')

  remit._engaged = new Promise((resolve, reject) => {
    getPublishChannel.apply(remit)
      .then((publishChannel) => {
        debug('Starting to consume new replies')

        return publishChannel.consume('amq.rabbitmq.reply-to', function (message) {
          debug('Consumed a reply', message.properties.correlationId)

          remit._emitter.emit(message.properties.correlationId, message)
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

  return remit._engaged
}

module.exports = consumeReplies
