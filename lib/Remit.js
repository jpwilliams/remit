'use strict'

const _ = require('lodash')
const EventEmitter = require('eventemitter3')
const util = require('util')
util.inherits(Remit, EventEmitter)

module.exports = function (o) {
    return new Remit(o)
}

function Remit (o) {
    o = o || {}

    this._entities = {emitters: {}}

    this._service_name = _.isString(o.name) ? o.name : ''
    this._url = _.isString(o.url) ? o.url : 'amqp://localhost'
    this._exchange_name = _.isString(o.exchange) ? o.exchange : 'remit'
    this._lazy = !!o.lazy

    this.__events.once.apply(this, [`__assert_connection`, this.__connect])
    this.__events.once.apply(this, [`__assert_exchange`, this.__exchange])
    this.__events.once.apply(this, [`__assert_work`, this.__work])
    this.__events.once.apply(this, [`__assert_publish`, this.__publish])
    this.__events.once.apply(this, [`__assert_consume`, this.__consume])
    this.__events.once.apply(this, [`__assert_reply`, this.__reply])

    if (!this._lazy) {
        this.__events.emit.apply(this, ['__assert_connection'])
    }
    
    return this
}

Remit.prototype.__events = {
    emit: Remit.prototype.emit,
    on: Remit.prototype.on,
    once: Remit.prototype.once,
    listeners: Remit.prototype.listeners,
    removeListener: Remit.prototype.removeListener
}

Remit.prototype.request = require('./external/request/index')()
Remit.prototype.req = Remit.prototype.request

// Remit.prototype.transient_request = require('./external/request/transient')
// Remit.prototype.treq = Remit.prototype.transient_request

Remit.prototype.emit = require('./external/request/emit')
Remit.prototype.broadcast = Remit.prototype.emit

Remit.prototype.respond = require('./external/response/index')()
Remit.prototype.res = Remit.prototype.respond
Remit.prototype.endpoint = Remit.prototype.respond

Remit.prototype.listen = require('./external/response/listen')
Remit.prototype.on = Remit.prototype.listen





Remit.prototype.__parser = require('./internal/parser/index')

Remit.prototype.__send = require('./internal/send/index')
Remit.prototype.__receive = require('./internal/receive/index')
Remit.prototype.__receive_data = require('./internal/receive/data')

Remit.prototype.__assert = require('./internal/assert')
Remit.prototype.__connect = require('./internal/assertions/connection')
Remit.prototype.__exchange = require('./internal/assertions/exchange')
Remit.prototype.__work = require('./internal/assertions/work')
Remit.prototype.__publish = require('./internal/assertions/publish')
Remit.prototype.__consume = require('./internal/assertions/consume')
Remit.prototype.__reply = require('./internal/assertions/reply')
