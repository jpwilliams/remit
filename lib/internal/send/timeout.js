var debug = require('debug')('remit:timeout')

module.exports = function __set_timeout (request) {
    var self = this

    var time = request.options.timeout

    if (!(time >= 0)) {
        throw new Error('Attempted to set timeout but invalid timer of "' + time + '" given')
    }

    request.options.timer = setTimeout(function timeout () {
        var args = ['timeout', {
            event: request.event,
            message: 'Timed out after no response for ' + time + 'ms',
            options: request.options
        }]

        self.request.__events.emit.apply(self.request.__events, args)
        request.__events.emit.apply(request, args)
    }, time)
}