const debug = require('debug')('remit:reply')
const getPublishChannel = require('./publishChannel')

function consumeReplies (type, request) {
  const remit = this

  debug('Requesting reply consumption')

  let channel

  return new Promise((resolve, reject) => {
    getPublishChannel.apply(remit)
      .then((publishChannel) => {
        debug('Starting to consume new replies')

        channel = publishChannel

        if (!type.options.expectReply) {
          return
        }

        return channel.consume('amq.rabbitmq.reply-to', function (message) {
          debug('Consumed a reply', message.properties.correlationId)

          remit._emitter.emit(message.properties.correlationId, message)
        }, {
          noAck: true,
          exclusive: true
        })
      }).then(() => {
        debug('Consuming new replies')

        return resolve(channel)
      }).catch((err) => {
        return reject(err)
      })
  })
}

module.exports = consumeReplies
