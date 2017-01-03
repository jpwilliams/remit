/* global describe, it, expect, remit */
// const amqplib = require('amqplib')
const Remit = require('../')

describe('Remit', function () {
  // let amqpCon = null

  // before(function (after) {
  //   amqplib.connect('amqp://localhost').then((connection) => {
  //     amqpCon = connection

  //     return after()
  //   })
  // })

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

    // it('should export Request and Response functions', function () {
    //   const remit = Remit()

    //   expect(remit.request).to.be.a('function')
    //   expect(remit.transientRequest).to.be.a('function')
    //   expect(remit.emit).to.be.a('function')
    //   expect(remit.delayedEmit).to.be.a('function')
    //   expect(remit.respond).to.be.a('function')
    //   expect(remit.listen).to.be.a('function')

    //   expect(remit.req).to.be.a('function')
    //   expect(remit.treq).to.be.a('function')
    //   expect(remit.demit).to.be.a('function')
    //   expect(remit.res).to.be.a('function')
    //   expect(remit.endpoint).to.be.a('function')
    //   expect(remit.on).to.be.a('function')
    // })

    // it('should successfully emit events', function (done) {
    //   const remit = Remit()

    //   remit._emitter.on('testEvent', done)
    //   remit._emitter.emit('testEvent')
    // })
  })

  describe('#init', function () {
    it('should connect')
  })
})
