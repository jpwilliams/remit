const EventEmitter = require('eventemitter3')
const Request = require('./lib/Request')
const Response = require('./lib/Response')
const aliases = require('./resources/aliases')
const connect = require('./lib/assertions/connection')

function Remit (options) {
  options = options || {}

  this._emitter = new EventEmitter()

  this._options = {
    exchange: options.exchange || 'remit'
  }

  this.request = Request.apply(this, [{shouldReply: true}])
  this.transientRequest = Request.apply(this, [{shouldReply: true}])
  this.emit = Request.apply(this, [{}])
  this.delayedEmit = Request.apply(this, [{}])
  this.respond = Response.apply(this, [{}])
  this.listen = Response.apply(this, [{}])

  Object.keys(aliases).forEach((key) => {
    aliases[key].forEach((alias) => {
      this[alias] = this[key]
    })
  })

  if (!options.lazy) {
    connect()
  }

  return this
}

module.exports = function (options) {
  return new Remit(options)
}
