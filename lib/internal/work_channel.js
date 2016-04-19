'use strict'

module.exports = function __work_channel (callback) {
    const self = this

    self.__assert_connection(() => {
        self._connection.createChannel().then((channel) => {
            channel.on('error', (err) => {
                console.error(err)
            })

            channel.on('close', () => {
                self._work_channel = null
                // self.once('__assert_work_channel', self.__work_channel)
                self.__work_channel()
            })

            self._work_channel = channel
            self.__emit('__work_channel', self._work_channel)
        }).catch((err) => {
            self.__emit('error', err)
        })
    })
}
