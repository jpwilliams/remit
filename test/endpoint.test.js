/* global describe, it, before */
const Remit = require('../')

describe('Endpoint', function () {
  let remit

  before(function () {
    remit = Remit()
  })

  describe('#object', function () {
    it('should be a function')
    it('should expose "on" global function')
    it('should return an Endpoint')
    it('should expose a "handler" function')
    it('should expose an "on" function')
    it('should expose an "options" function')
    it('should expose a "start" function')
  })

  describe('#usage', function () {
    it('should not start consuming until `start` called')
    it('should throw if handler not specified on start')
    it('should allow a handler to be set when creating')
    it('should allow a handler being set via the "handler" function')
    it('should throw if "handler" run with no handlers')
    it('should return a promise on "start" that resolves when consuming')
    it('should return synchronous data')
    it('should return data via promises')
    it('should return data via callback')
    it('should return synchronous error')
    it('should return promise rejection')
    it('should return callback error')
    it('should')
  })
})
