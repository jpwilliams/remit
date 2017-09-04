/* global describe, it, before */
const Remit = require('../../')
const parse = require('../../utils/parseAmqpUrl')

describe('parseAmqpUrl', function () {
  it('should add protocol if missing', function () {
    expect(
      parse('localhost')
    ).to.equal('amqp://localhost?frameMax=0x1000&heartbeat=15')
  })

  it('should throw if invalid protocol given', function () {
    expect(
      parse.bind(null, 'amq://localhost')
    ).to.throw('Incorrect protocol')
  })

  it('should overwrite and merge query strings', function () {
    expect(
      parse('localhost?here=we&go=whoosh&heartbeat=30')
    ).to.equal('amqp://localhost?frameMax=0x1000&heartbeat=30&here=we&go=whoosh')
  })

  it('should match with username and password', function () {
    expect(
      parse('amqp://user:pass@localhost:5672')
    ).to.equal('amqp://user:pass@localhost:5672?frameMax=0x1000&heartbeat=15')
  })

  it('should match with username and password with options', function () {
    expect(
      parse('amqp://user:pass@localhost:5672?heartbeat=30')
    ).to.equal('amqp://user:pass@localhost:5672?frameMax=0x1000&heartbeat=30')
  })
})
