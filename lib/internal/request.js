'use strict'

const EventEmitter = require('eventemitter3')

module.exports = function __request (args, data, callback, options) {
    const self = this

    const emitter = new EventEmitter()

    if (options.correlationId) {
        self._waiting_emitters[options.correlationId] = emitter
    }

    options.appId = self._service_name
    options.type = args.event

    emitter.options = options

    function send_request () {
        if (!data) {
            data = Array.from(arguments)
        }

        self.__assert_connection(() => {
            self.__assert_exchange(() => {
                self.__assert_publish_channel((publish_channel) => {
                    function send_message () {
                        self.__set_timeout(emitter, options.timeout)

                        publish_channel.publish(
                            self._exchange_name,
                            args.event,
                            self.__build.request(args, data, options),
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
                        // What do we want to do here, eh?
                        console.error(err)
                    })
                })
            })
        })

        return emitter
    }

    if (data || callback) {
        send_request()
    } else {
        emitter.send = send_request
    }

    return emitter
}
