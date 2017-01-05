/* global describe, it, expect, remit */
// const amqplib = require('amqplib')
const Remit = require('../')

describe('Remit', function () {
  describe('#object', function () {
    it('should export a Remit function', function () {
      expect(Remit).to.be.a('function')
    })

    it('should export an event emitter', function () {
      expect(remit).to.be.an('object')
      expect(remit._emitter).to.be.an('object')
      expect(remit._emitter.on).to.be.a('function')
      expect(remit._emitter.emit).to.be.a('function')
    })

    it('should export Request and Response functions', function () {
      const remit = Remit()

      expect(remit.request).to.be.a('function')
      expect(remit.req).to.equal(remit.request)

      expect(remit.emit).to.be.a('function')

      expect(remit.delayedEmit).to.be.a('function')
      expect(remit.demit).to.equal(remit.delayedEmit)

      expect(remit.respond).to.be.a('function')
      expect(remit.res).to.equal(remit.respond)
      expect(remit.endpoint).to.equal(remit.respond)

      expect(remit.respondQueue).to.be.a('function')
      expect(remit.resq).to.equal(remit.respondQueue)
      expect(remit.queue).to.equal(remit.respondQueue)

      expect(remit.listen).to.be.a('function')
      expect(remit.on).to.equal(remit.listen)
    })

    it('should successfully emit events', function (done) {
      const remit = Remit()

      remit._emitter.on('testEvent', done)
      remit._emitter.emit('testEvent')
    })
  })

  describe('#init', function () {
    it('should connect')
  })
})
