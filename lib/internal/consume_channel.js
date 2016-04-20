'use strict'

module.exports = function __consume_channel (callback) {
    const self = this

    self.__assert_connection(() => {
        self._connection.createChannel().then((channel) => {
            // channel.on('error', (err) => {
            //     console.error(err)
            // })

            channel.on('close', () => {
                self._consume_channel = null
                // self.once('__assert_consume_channel', self.__consume_channel)
                self.__consume_channel()
            })

            self._consume_channel = channel
            self.__emit('__consume_channel', self._consume_channel)
        }).catch((err) => {
            self.__emit('error', err)
        })
    })
}
