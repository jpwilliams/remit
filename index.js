const packageJson = require('./package.json')
const EventEmitter = require('eventemitter3')
const Request = require('./lib/Request')
const Response = require('./lib/Response')
const aliases = require('./resources/aliases')
const connect = require('./lib/assertions/connection')
const bootWorkChannelPool = require('./lib/assertions/bootWorkChannelPool')

function Remit (options) {
  options = options || {}

  this.version = packageJson.version
  this._emitter = new EventEmitter()
  this._publishPools = {}

  this._options = {
    exchange: options.exchange || 'remit',
    name: options.name || process.env.REMIT_NAME || '',
    url: options.url || process.env.REMIT_URL || 'amqp://localhost'
  }

  this._internal = {
    listenerCount: 0
  }

  this.request =
  this.requestOne =
  this.req = Request.apply(this, [{
    expectReply: true
  }])

  this.emit =
  this.publish = Request.apply(this, [{
    expectReply: false
  }])

  this.respond =
  this.res =
  this.endpoint = Response.apply(this, [{
    shouldAck: false,
    shouldReply: true
  }])

  this.listen =
  this.on = Response.apply(this, [{
    shouldAck: true,
    shouldReply: false,

    before: (remit, options) => {
      options.queue = options.queue || `${options.event}:l:${remit._options.name}:${++remit._internal.listenerCount}`

      return options
    }
  }])

  connect.apply(this, [this._options])
  this._workChannelPool = bootWorkChannelPool.apply(this)

  return this
}

module.exports = function (options) {
  return new Remit(options)
}
