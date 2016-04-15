'use strict'

const EventEmitter = require('events').EventEmitter

module.exports = function __request (args, data, callback, options) {
    const self = this

    let emitter

    if (options.correlationId) {
        emitter = self._waiting_emitters[options.correlationId] = new EventEmitter()
        emitter.options = options
    }

    self.__assert_connection(() => {
        self.__assert_exchange(() => {
            console.log("ASSERTING PUBLIC CHANNEL HERE")
            self.__assert_publish_channel((publish_channel) => {
                if (callback) {
                    emitter.on('reply', callback)
                    // self.__set_timeout(emitter)
                }

                const send_message = function send_message () {
                    publish_channel.publish(
                        self._exchange_name,
                        args.event,
                        new Buffer(self.__build.request(args, data, options)),
                        options
                    )
                }

                if (self._publish_channel_consuming) {
                    return send_message()
                }

                publish_channel.consume('amq.rabbitmq.reply-to', function (message) {
                    self.__on_reply.apply(self, arguments)
                }, {
                    exclusive: true,
                    noAck: true
                }).then(send_message).then(null, (err) => {
                    console.error(err)
                })
            })
        })
    })

    return emitter
}
