/* global describe, it, expect, sinon, before */

const Remit = require('../../')
const remit1 = Remit()
const remit2 = Remit()
const endpointDataCallback = sinon.spy()
const requestDataCallback = sinon.spy()

const request = remit1
  .request('cases.multiple')
  .data(requestDataCallback)

describe('Cases#multiple', function () {
  before(function (done) {
    remit2
      .endpoint('cases.multiple')
      .data(endpointDataCallback)
      .data((event, callback) => {
        return callback('errrrr')
      })
      .ready(done)
  })

  it('should get a reply', function (done) {
    request.send({foo: 'bar'}).then((result) => {
      return done('Should not be successful')
    }).catch((err) => {
      expect(err).to.equal('errrrr')

      return done()
    })
  })
})
