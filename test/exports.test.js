/* global describe, it, before, expect */
const Remit = require('../')
const version = require('../package.json').version

describe('Remit', function () {
  let remit

  before(function () {
    remit = Remit()
  })

  describe('#object', function () {
    it('should export the remit function', function () {
      expect(Remit).to.be.a('function')
    })

    it('should export a version', function () {
      expect(remit).to.have.property('version', version)
    })

    it('should export "listen" function', function () {
      expect(remit.listen).to.be.a('function')
    })

    it('should export "emit" function', function () {
      expect(remit.emit).to.be.a('function')
    })

    it('should export "endpoint" function', function () {
      expect(remit.endpoint).to.be.a('function')
    })

    it('should export "request" function', function () {
      expect(remit.request).to.be.a('function')
    })

    it('should export "on" function', function () {
      expect(remit.on).to.be.a('function')
    })
  })
})
