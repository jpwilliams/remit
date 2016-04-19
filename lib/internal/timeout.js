'use strict'

module.exports = function __set_timeout (emitter, timeout) {
    setTimeout(() => {
        emitter.emit('__timeout')
    }, timeout)

    emitter.once('__timeout', () => {
        console.log('nothin')
    })
}
