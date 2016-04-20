'use strict'

module.exports = function __set_timeout (emitter, timeout) {
    emitter.once('__timeout', () => {
        console.log('nothin')
    })

    emitter.once('reply', () => {
        clearTimeout(emitter.timer)
        delete emitter.timer
    })

    emitter.timer = setTimeout(() => {
        emitter.emit('__timeout')
    }, timeout)
}
