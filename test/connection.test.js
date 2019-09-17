/* global describe, it, before, expect */
describe('Connection', function () {
  describe('#connect', function () {
    it(`connection should throw`, done => {
      const url = 'amqp://not-a-real-host'
      const Remit = require('../')

      var originalException = process.listeners('uncaughtException').pop()

      process.removeListener('uncaughtException', originalException);
      process.once("uncaughtException", function (error) {
        recordedError = error
        expect(recordedError.errno).to.be.oneOf(['ENOTFOUND', 'EAI_AGAIN'])
        done()
      })

      const remit = Remit({ url })

      remit
        .request('foo')
        .send({})

      process.nextTick(function () {
        process.listeners('uncaughtException').push(originalException)
      })
    })
  })
})
