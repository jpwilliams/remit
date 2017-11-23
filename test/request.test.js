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
        .endpoint('jalfrezi')
        .handler(async (event) => {
          return event.data
        })
        .start()

      const result = await remit.request('jalfrezi')('jalfrezi was crazy')
      expect(result).to.equal('jalfrezi was crazy')
    })

    it('should not curry when exhausted', async function () {
      await remit
        .endpoint('vindaloo')
        .handler(async (event) => {
          return event.data
        })
        .start()

      const result = await remit.request('vindaloo', 'vindaloo put me on the loo')
      expect(result).to.equal('vindaloo put me on the loo')
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
