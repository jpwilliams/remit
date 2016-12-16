const EventEmitter = require('eventemitter3')
const Request = require('./lib/Request')
const Respond = require('./lib/Respond')
const aliases = require('./resources/aliases')
const connect = require('./lib/assertions/connection')

function Remit (options) {
  options = options || {}

  this._emitter = new EventEmitter(),

  this._options = {
    exchange: options.exchange || 'remit'
  },

  this.request = Request.apply(this, [{}])
  this.transientRequest = Request.apply(this, [{}])
  this.emit = Request.apply(this, [{}])
  this.delayedEmit = Request.apply(this, [{}])
  this.respond = Respond.apply(this, [{}])
  this.listen = Respond.apply(this, [{}])

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
