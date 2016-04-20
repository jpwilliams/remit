'use strict'

module.exports = function __handle_reply (message) {
    const self = this

    const emitter = self._waiting_emitters[message.properties.correlationId]

    if (!emitter) {
        return
    }

    const full_message_data = JSON.parse(message.content.toString())
    const data = full_message_data.result
    const args = ['reply'].concat(data)

    // emitter.emit.apply(emitter, ['reply', emitter])
    emitter.emit.apply(emitter, args, emitter)
    // self.__emit.apply(self, args, emitter)

    delete self._waiting_emitters[message.properties.correlationId]
}
