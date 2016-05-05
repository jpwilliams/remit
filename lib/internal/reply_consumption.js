'use strict'

module.exports = function __reply_consumption (callback) {
    const self = this

    self.__assert_connection(() => {
        self.__assert_publish_channel((publish_channel) => {
            publish_channel.consume('amq.rabbitmq.reply-to', function (message) {
                self.__handle_reply.apply(self, arguments)
            }, {
                exclusive: true,
                noAck: true
            }).then(() => {
                self._publish_channel_consuming = true
                console.log('GODDIT')
                self.__emit('__reply_consumption', publish_channel)
            }).then(null, (err) => {
                console.error(err)
            })
        })
    })
}
