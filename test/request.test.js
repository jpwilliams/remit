/* global describe, it, before, expect */
const Remit = require('../')

describe('Request', function () {
  let remit

  before(function () {
    remit = Remit()
  })

  describe('#object', function () {
    it('should be a function', function () {
      expect(remit.request).to.be.a('function')
    })
    it('should expose "on" global function', function () {
      expect(remit.endpoint.on).to.be.a('function')
    })
  })

  describe('#return', function () {
    let remit, request

    before(function () {
      remit = Remit()
      request = remit.request('request-test')
    })

    it('should throw if no event given', function () {
      expect(remit.request).to.throw('No/invalid event specified when creating a request')
    })

    it('should throw if given no event in options object', function () {
      expect(remit.request.bind(remit, {})).to.throw('No/invalid event specified when creating a request')
    })

    it('should allow options to be set on first run', function () {
      const req = remit.request({
        event: 'tester-123',
        timeout: 2000
      })

      expect(req._options).to.have.property('event', 'tester-123')
      expect(req._options).to.have.property('timeout', 2000)
    })

    it('should return a Request', function () {
      expect(request).to.be.an.instanceof(remit.request.Type)
    })

    it('should be runnable (#send)', function () {
      expect(request).to.be.a('function')
    })

    it('should expose an "on" function', function () {
      expect(request.on).to.be.a('function')
    })
    it('should expose a "fallback" function', function () {
      expect(request.fallback).to.be.a('function')
    })
    it('should expose an "options" function', function () {
      expect(request.options).to.be.a('function')
    })
    it('should expose a "ready" function', function () {
      expect(request.ready).to.be.a('function')
    })
    it('should expose a "send" function', function () {
      expect(request.send).to.be.a('function')
    })
  })

  describe('#usage', function () {
    let remit

    before(function () {
      remit = Remit({name: 'requestRemit'})
    })

    it('should assign new options over old ones', function () {
      const request = remit.request('options-test')
      expect(request._options).to.have.property('event', 'options-test')
      request.options({event: 'options-queue'})
      expect(request._options).to.have.property('event', 'options-queue')
    })

    it('should parse timestrings in a timeout option', function () {
      const request = remit.request('options-timestring-test')
      request.options({timeout: '30m'})
      expect(request._options).to.have.property('timeout', 1800000)
      request.options({timeout: '2s'})
      expect(request._options).to.have.property('timeout', 2000)
    })

    it('should return \'ready\' promise when request is ready to be used', function () {
      this.slow(200)

      const request = remit.request('on-start')
      const ret = request.ready()
      expect(ret).to.be.a('promise')

      return ret
    })

    it('should allow a fallback to be set', function () {
      const request = remit.request('fallback-test')
      expect(request).to.not.have.property('_fallback')
      request.fallback(123)
      expect(request).to.have.property('_fallback', 123)
    })

    it('should allow a falsy fallback to be set', function () {
      const request = remit.request('fallback-test-falsy')
      expect(request).to.not.have.property('_fallback')
      request.fallback(null)
      expect(request).to.have.property('_fallback', null)
    })

    it('should allow a fallback to be unset', function () {
      const request = remit.request('fallback-test-unset')
      expect(request).to.not.have.property('_fallback')
      request.fallback('testfallback')
      expect(request).to.have.property('_fallback', 'testfallback')
      request.fallback()
      expect(request).to.not.have.property('_fallback')
    })

    it('should throw if sent with invalid priority', async function () {
      const request = remit.request('invalid-priority')
      request.options({priority: 11})

      try {
        await request()
        throw new Error('Should have failed with invalid priority')
      } catch (e) {
        expect(e.message).to.equal('Invalid priority "11" when making request')
      }
    })

    it('should timeout in configurable times', async function () {
      this.slow(2000)

      const request = remit.request('timeout-test')
      request.options({timeout: 1000})

      try {
        await request()
        throw new Error('Request should not have succeeded')
      } catch (e) {
        expect(e.message).to.equal('Request timed out after no response for 1000ms')
      }
    })

    it('should return fallback if timing out and fallback set')
    it('should expire from queue after same time as timeout')
    it('should send NULL if given unparsable data')
  })
})
