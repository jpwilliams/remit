/* global describe, it, before, expect */
const Remit = require('../')

describe('Request', function () {
  let remit

  before(function () {
    remit = Remit()
  })

  describe('#currying', function () {
    it('should curry when not exhausted', async function () {
      await remit
        .endpoint('get_jalfrezi')
        .handler(async (event) => {
          return event.data
        })
        .start()

      const result = await remit.request('get_jalfrezi')('got a jalfrezi')
      expect(result).to.equal('got a jalfrezi')
    })

    it('should not curry when exhausted', async function () {
      await remit
        .endpoint('get_vindaloo')
        .handler(async (event) => {
          return event.data
        })
        .start()

      const result = await remit.request('get_vindaloo', 'got a vindaloo')
      expect(result).to.equal('got a vindaloo')
    })
  })

  describe('#object', function () {
    it('should be a function')
    it('should expose "on" global function')
    it('should return a Request')
    it('should be runnable (#send)')
    it('should expose an "on" function')
    it('should expose a "fallback" function')
    it('should expose an "options" function')
    it('should expose a "ready" function')
    it('should expose a "send" function')
  })
})
