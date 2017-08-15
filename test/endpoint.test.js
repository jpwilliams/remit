/* global describe, it, before */
const Remit = require('../')

describe('Endpoint', function () {
  let remit

  before(function () {
    remit = Remit()
  })

  describe('#object', function () {
    it('should be a function', function () {
      expect(remit.endpoint).to.be.a('function')
    })

    it('should expose "on" global function', function () {
      expect(remit.endpoint.on).to.be.a('function')
    })
  })

  describe('#return', function () {
    let remit, endpoint

    before(function () {
      remit = Remit()
      endpoint = remit.endpoint('endpoint-test')
    })

    it('should throw if given no event', function () {
      expect(remit.endpoint.bind()).to.throw('No/invalid event specified when creating an endpoint')
    })

    it('should throw if given invalid event', function () {
      expect(remit.endpoint.bind(null, 123)).to.throw('No/invalid event specified when creating an endpoint')
    })

    it('should throw if given invalid options object', function () {
      expect(remit.endpoint.bind(null, {})).to.throw('No/invalid event specified when creating an endpoint')
    })

    it('should return an Endpoint', function () {
      expect(endpoint).to.be.an.instanceof(remit.endpoint.Type)
    })

    it('should expose a "handler" function', function () {
      expect(endpoint.handler).to.be.a('function')
    })

    it('should expose an "on" function', function () {
      expect(endpoint.on).to.be.a('function')
    })

    it('should expose an "options" function', function () {
      expect(endpoint.options).to.be.a('function')
    })

    it('should expose a "start" function', function () {
      expect(endpoint.start).to.be.a('function')
    })
  })

  describe('#usage', function () {
    let remit

    before(function () {
      remit = Remit({name: 'endpointRemit'})
    })

    it('should assign new options over old ones', function () {
      const endpoint = remit.endpoint('options-test')
      expect(endpoint._options).to.have.property('event', 'options-test')
      expect(endpoint._options).to.have.property('queue', 'options-test')
      endpoint.options({queue: 'options-queue'})
      expect(endpoint._options).to.have.property('event', 'options-test')
      expect(endpoint._options).to.have.property('queue', 'options-queue')
    })

    it('should not start consuming until `start` called')

    it('should throw if handler not specified on start', function () {
      const endpoint = remit.endpoint('no-handler-test')
      expect(endpoint.start.bind(endpoint)).to.throw('Trying to boot endpoint with no handler')
    })

    it('should allow a handler to be set when creating', function () {
      const endpoint = remit.endpoint('handler-set-start', () => {})
      expect(endpoint._handler).to.be.a('function')
    })

    it('should allow a handler being set via the "handler" function', function () {
      const endpoint = remit.endpoint('handler-set-later')
      expect(endpoint._handler).to.equal(undefined)
      endpoint.handler(() => {})
      expect(endpoint._handler).to.be.a('function')
    })

    it('should throw if "handler" run with no handlers', function () {
      const endpoint = remit.endpoint('handler-no-err')
      expect(endpoint.handler.bind(endpoint)).to.throw('No handler(s) given when trying to set endpoint handler(s)')
    })

    it('should return a promise on "start" that resolves when consuming', function () {
      this.slow(200)

      const endpoint = remit.endpoint('on-start', () => {})
      const ret = endpoint.start()
      expect(ret).to.be.a('promise')

      return ret
    })

    it('should return synchronous data', async function () {
      const endpoint = await remit
        .endpoint('return-1')
        .handler(() => {
          return 'foobar1'
        })
        .start()

      const result = await remit.request('return-1')()
      expect(result).to.equal('foobar1')
    })

    it('should return data via promises', async function () {
      const endpoint = await remit
        .endpoint('return-2')
        .handler(async () => {
          return 'foobar2'
        })
        .start()

      const result = await remit.request('return-2')()
      expect(result).to.equal('foobar2')
    })

    it('should return data via callback', async function () {
      const endpoint = await remit
        .endpoint('return-3')
        .handler((event, callback) => {
          callback(null, 'foobar3')
        })
        .start()

      const result = await remit.request('return-3')()
      expect(result).to.equal('foobar3')
    })

    it('should return synchronous error', async function () {
      const endpoint = await remit
        .endpoint('return-err-1')
        .handler(() => {
          throw 'fail1'
        })
        .start()

      try {
        await remit.request('return-err-1')()
        throw new Error('Request succeeded')
      } catch (e) {
        expect(e).to.equal('fail1')
      }
    })

    it('should return promise rejection', async function () {
      const endpoint = await remit
        .endpoint('return-err-2')
        .handler(async () => {
          throw 'fail2'
        })
        .start()

      try {
        await remit.request('return-err-2')()
        throw new Error('Request succeeded')
      } catch (e) {
        expect(e).to.equal('fail2')
      }
    })

    it('should return callback error', async function () {
      const endpoint = await remit
        .endpoint('return-err-3')
        .handler((event, callback) => {
          callback('fail3')
        })
        .start()

      try {
        await remit.request('return-err-3')()
        throw new Error('Request succeeded')
      } catch (e) {
        expect(e).to.equal('fail3')
      }
    })

    it('should return data early from synchronous middleware', async function () {
      const endpoint = await remit
        .endpoint('return-4')
        .handler((event, callback) => {
          callback(null, 'foobar4')
        })
        .start()

      const result = await remit.request('return-4')()
      expect(result).to.equal('foobar4')
    })

    it('should return data early from promises middleware')
    it('should return data early from callback middleware')
    it('should return error from synchronous middleware')
    it('should return error from promises middleware')
    it('should return error from callback middleware')
    it('should return final data from synchronous middleware')
    it('should return final data from promises middleware')
    it('should return final data from callback middleware')
    it('should return final error from synchronous middleware')
    it('should return final error from promises middleware')
    it('should return final error from callback middleware')
    it('should pass the same `event` to every handler')
    it('should allow changing handlers')
    it('should throw if consumer cancelled remotely')
  })
})
