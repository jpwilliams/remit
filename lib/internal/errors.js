'use strict'

const util = require('util')

util.inherits(module.exports, Error)

module.exports = {
    InvalidArguments
}






function InvalidArguments (message) {
    Error.captureStackTrace(this, this.constructor)
    this.name = this.constructor.name
    this.message = message
    this.data = Array.prototype.slice.call(arguments, 1)
}
