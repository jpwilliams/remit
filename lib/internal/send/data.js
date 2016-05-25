'use strict'

const debug = require('debug')('remit:send:data')

module.exports = function __send_data (message) {
    const self = this
        
    if (!message.properties.correlationId) {
        throw new Error('Fuck')
    }

    const emitter = self._entities.emitters[message.properties.correlationId]

    if (!emitter) {
        return
    }

    var args = ['data'].concat(JSON.parse(message.content.toString()).result)

    debug(`Emitting data for new message`, args)
    
    emitter.__events.emit.apply(emitter, args)
    delete self._entities.emitters[message.properties.correlationId]
    
    debug(`Done`)
}