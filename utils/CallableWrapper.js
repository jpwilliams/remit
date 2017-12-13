const CallableInstance = require('callable-instance')
const EventEmitter = require('eventemitter3')

const listeners = [
  'received',
  'sent',
  'timeout',
  'error',
  'success'
]

class CallableWrapper extends CallableInstance {
  constructor (remit, Type) {
    super('_create')

    this.remit = remit
    this.Type = Type
    this._emitter = new EventEmitter()
  }

  on (...args) {
    this._emitter.on(...args)

    return this
  }

  _create (...args) {
    const ret = new this.Type(this.remit, ...args)

    for (const k of listeners) {
      ret.on(k, (...x) => this._emitter.emit(k, ...x))
    }

    return ret
  }
}

module.exports = CallableWrapper
