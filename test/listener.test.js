/* global describe, it, before */
const Remit = require('../')

describe('Listener', function () {
  let remit

  before(function () {
    remit = Remit()
  })

  describe('#object', function () {
    it('should be a function', function () {
      expect(remit.listen).to.be.a('function')
    })

    it('should expose "on" global function', function () {
      expect(remit.listen.on).to.be.a('function')
    })
  })

  describe('#return', function () {
    let listener

    before(async function () {
      listener = remit.listen('foo')
    })

    it('should return a Listener', function () {
      expect(listener).to.be.an.instanceof(remit.listen.Type)
    })

    it('should expose a "handler" function', function () {
      expect(listener.handler).to.be.a('function')
    })

    it('should expose an "on" function', function () {
      expect(listener.on).to.be.a('function')
    })

    it('should expose an "options" function', function () {
      expect(listener.options).to.be.a('function')
    })

    it('should expose a "start" function', function () {
      expect(listener.start).to.be.a('function')
    })
  })
})
