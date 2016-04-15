'use strict'

module.exports = function __publish_channel (callback) {
    const self = this

    self.__assert_connection(() => {
        self._connection.createChannel().then((channel) => {
            channel.on('error', (err) => {
                console.error(err)
            })

            channel.on('close', () => {
                self._publish_channel = null
                self.once('__assert_publish_channel', self.__publish_channel)
            })

            self._publish_channel = channel
            self.__emit('__publish_channel', self._publish_channel)
        }).catch((err) => {
            self.__emit('error', err)
        })
    })
}
