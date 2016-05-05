'use strict'

module.exports = function __assert_reply_consumption (callback) {
    const self = this

    self.__emit('__assert_reply_consumption')

    if (!callback) {
        return
    }

    if (self._publish_channel_consuming) {
        self.__assert_publish_channel((publish_channel) => {
            return callback(publish_channel)
        })
    }

    self.once('__reply_consumption', callback)
}
