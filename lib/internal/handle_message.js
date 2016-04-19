'use strict'

module.exports = function __handle_message (message, emitter) {
    const self = this

    const message_data = JSON.parse(message.content.toString()).params

    const extra = {
        service: message.properties.appId,
        event: message.properties.type
        // caller: message.properties.messageId
    }

    const done = function done () {
        const ack = function ack () {
            self.__assert_consume_channel((consume_channel) => {
                consume_channel.ack(message)
            })
        }

        if (!message.properties.correlationId) {
            return ack()
        }

        // const response_data = new Buffer(JSON.stringify(Array.prototype.slice.call(arguments)))
        const options = {correlationId: message.properties.correlationId}
        const response_data = self.__build.response(Array.prototype.slice.call(arguments), options)

        function check_and_republish () {
            self.__assert_work_channel((work_channel) => {
                work_channel.checkQueue(message.properties.replyTo).then(() => {
                    self.__assert_publish_channel((publish_channel) => {
                        publish_channel.publish('', message.properties.replyTo, response_data, options)
                    })

                    ack()
                }).then(null, (err) => {
                    if (err.message.substr(0, 16) === 'Operation failed') {
                        self.__assert_consume_channel((consume_channel) => {
                            consume_channel.nack(message, false, false)
                        })
                    } else {
                        check_and_republish()
                    }
                })
            })
        }

        check_and_republish()
    }

    if (!message.properties.timestamp) {
        emitter.emit.apply(emitter, ['message', done].concat(message_data), self)
    } else {
        const time_to_wait = parseInt(message.properties.timestamp - new Date().getTime())

        if (time_to_wait <= 0) {
            emitter.emit.apply(emitter, ['message', done].concat(message_data), self)
        } else {
            setTimeout(() => {
                emitter.emit.apply(emitter, ['message', done].concat(message_data), self)
            }, time_to_wait)
        }
    }
}
