/* global describe, it, before, expect */
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
        .handler(() => {
          return 'foobar4'
        }, () => {
          return 'fail'
        })
        .start()

      const result = await remit.request('return-4')()
      expect(result).to.equal('foobar4')
    })

    it('should return data early from promises middleware', async function () {
      const endpoint = await remit
        .endpoint('return-5')
        .handler(async () => {
          return 'foobar5'
        }, async () => {
          return 'fail'
        })
        .start()

      const result = await remit.request('return-5')()
      expect(result).to.equal('foobar5')
    })

    it('should return data early from callback middleware', async function () {
      const endpoint = await remit
        .endpoint('return-6')
        .handler((event, callback) => {
          callback(null, 'foobar6')
        }, (event, callback) => {
          callback(null, 'fail')
        })
        .start()

      const result = await remit.request('return-6')()
      expect(result).to.equal('foobar6')
    })

    it('should return error from synchronous middleware', async function () {
      const endpoint = await remit
        .endpoint('return-err-4')
        .handler(() => {
          throw 'fail4'
        }, () => {
          throw 'fail'
        })
        .start()

      try {
        await remit.request('return-err-4')()
        throw new Error('Request succeeded')
      } catch (e) {
        expect(e).to.equal('fail4')
      }
    })

    it('should return error from promises middleware', async function () {
      const endpoint = await remit
        .endpoint('return-err-5')
        .handler(async () => {
          throw 'fail5'
        }, async () => {
          throw 'fail'
        })
        .start()

      try {
        await remit.request('return-err-5')()
        throw new Error('Request succeeded')
      } catch (e) {
        expect(e).to.equal('fail5')
      }
    })

    it('should return error from callback middleware', async function () {
      const endpoint = await remit
        .endpoint('return-err-6')
        .handler((event, callback) => {
          callback('fail6')
        }, (event, callback) => {
          callback('fail')
        })
        .start()

      try {
        await remit.request('return-err-6')()
        throw new Error('Request succeeded')
      } catch (e) {
        expect(e).to.equal('fail6')
      }
    })

    it('should return final data from synchronous middleware', async function () {
      const endpoint = await remit
        .endpoint('return-7')
        .handler(() => {
          return
        }, () => {
          return 'foobar7'
        })
        .start()

      const result = await remit.request('return-7')()
      expect(result).to.equal('foobar7')
    })

    it('should return final data from promises middleware', async function () {
      const endpoint = await remit
        .endpoint('return-8')
        .handler(async () => {
          return
        }, async () => {
          return 'foobar8'
        })
        .start()

      const result = await remit.request('return-8')()
      expect(result).to.equal('foobar8')
    })

    it('should return final data from callback middleware', async function () {
      const endpoint = await remit
        .endpoint('return-9')
        .handler((event, callback) => {
          callback()
        }, (event, callback) => {
          callback(null, 'foobar9')
        })
        .start()

      const result = await remit.request('return-9')()
      expect(result).to.equal('foobar9')
    })

    it('should return final error from synchronous middleware', async function () {
      const endpoint = await remit
        .endpoint('return-err-7')
        .handler(() => {
          return
        }, () => {
          throw 'fail7'
        })
        .start()

      try {
        await remit.request('return-err-7')()
        throw new Error('Request succeeded')
      } catch (e) {
        expect(e).to.equal('fail7')
      }
    })

    it('should return final error from promises middleware', async function () {
      const endpoint = await remit
        .endpoint('return-err-8')
        .handler(async () => {
          return
        }, async () => {
          throw 'fail8'
        })
        .start()

      try {
        await remit.request('return-err-8')()
        throw new Error('Request succeeded')
      } catch (e) {
        expect(e).to.equal('fail8')
      }
    })

    it('should return final error from callback middleware', async function () {
      const endpoint = await remit
        .endpoint('return-err-9')
        .handler((event, callback) => {
          callback()
        }, (event, callback) => {
          callback('fail9')
        })
        .start()

      try {
        await remit.request('return-err-9')()
        throw new Error('Request succeeded')
      } catch (e) {
        expect(e).to.equal('fail9')
      }
    })

    it('should instantly return values in handlers', async function () {
      await remit
        .endpoint('handler-values')
        .handler('handler-values-foobar')
        .start()

      const result = await remit.request('handler-values')()
      expect(result).to.equal('handler-values-foobar')
    })

    it('should instantly return even falsey values in handlers', async function () {
      await remit
        .endpoint('handler-values-falsey')
        .handler(0)
        .start()

      const result = await remit.request('handler-values-falsey')()
      expect(result).to.equal(0)
    })

    it('should pass the same `event` to every handler', async function () {
      const endpoint = await remit
        .endpoint('same-event')
        .handler((event) => {
          event.custom = 'blamblam'
        }, (event) => {
          expect(event.custom).to.equal('blamblam')

          return event.custom
        })
        .start()

      const result = await remit.request('same-event')()
      expect(result).to.equal('blamblam')
    })

    it('should allow changing handlers realtime', async function () {
      const endpoint = await remit
        .endpoint('changing-handlers')
        .handler(() => 'foobar')
        .start()

      const req = await remit.request('changing-handlers').ready()
      let res = await req()
      expect(res).to.equal('foobar')
      endpoint.handler(() => 'bazqux')
      res = await req()
      expect(res).to.equal('bazqux')
    })

    it('should throw if consumer cancelled remotely')
  })
})
