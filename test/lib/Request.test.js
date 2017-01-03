/* global describe, it, expect, sinon, remit */
remit
  .endpoint('request.test.error')
  .data((event, callback) => {
    return callback('This is expected.')
  })

describe('Request', function () {
  describe('#init', function () {
    let request
    const dataCallback = sinon.spy()
    const sentCallback = sinon.spy()

    it('should fail if no endpoint name given', function () {
      expect(() => {
        remit.request()
      }).to.throw('No event given')
    })

    it('should set up a request', function () {
      request = remit.request('request.test.error')

      expect(request).to.be.a('function')
      expect(request.send).to.equal(request)
      expect(request.data).to.be.a('function')
      expect(request.sent).to.be.a('function')
    })

    it('should add a data listener', function () {
      request.data(dataCallback)

      expect(request._emitter._events.data).to.be.an('object')
      expect(request._emitter._events.data.fn).to.equal(dataCallback)
    })

    it('should add a sent listener', function () {
      request.sent(sentCallback)

      expect(request._emitter._events.sent).to.be.an('object')
      expect(request._emitter._events.sent.fn).to.equal(sentCallback)
    })

    it('should send a request and get an error back', function (done) {
      request
        .data((err, result) => {
          expect(dataCallback).to.have.been.called
          expect(err).to.equal('This is expected.')
          expect(result).to.equal(undefined)
        })
        .sent(() => {
          expect(sentCallback).to.have.been.called
        })
        .send({foo: 'bar'})
        .catch((err) => {
          expect(err).to.equal('This is expected.')

          return done()
        })
    })
  })
})
