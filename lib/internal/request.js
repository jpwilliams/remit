'use strict'

const EventEmitter = require('events').EventEmitter

module.exports = function __request (args, data, callback, options) {
    const self = this

    const emitter = new EventEmitter()

    if (options.correlationId) {
        emitter.options = options
        self._waiting_emitters[options.correlationId] = emitter
    }

    self.__assert_connection(() => {
        self.__assert_exchange(() => {
            self.__assert_publish_channel((publish_channel) => {
                if (callback) {
                    emitter.on('reply', callback)
                    // self.__set_timeout(emitter)
                }

                function send_message () {
                    publish_channel.publish(
                        self._exchange_name,
                        args.event,
                        new Buffer(self.__build.request(args, data, options)),
                        options
                    )

                    emitter.emit('sent')
                }

                if (self._publish_channel_consuming) {
                    return send_message()
                }

                publish_channel.consume('amq.rabbitmq.reply-to', function (message) {
                    self.__handle_reply.apply(self, arguments)
                }, {
                    exclusive: true,
                    noAck: true
                }).then(() => {
                    self._publish_channel_consuming = true
                    send_message()
                }).then(null, (err) => {
                    console.error(err)
                })
            })
        })
    })

    return emitter
}
