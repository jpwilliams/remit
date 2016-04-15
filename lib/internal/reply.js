'use strict'

module.exports = function __on_reply (message) {
    const self = this

    const emitter = self._waiting_emitters[message.properties.correlationId]

    if (!emitter) {
        return
    }

    emitter.emit.apply(emitter, ['reply'].concat(JSON.parse(message.content.toString())))
}
