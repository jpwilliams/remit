/* global describe, it, before, expect */
const Remit = require('../')

describe('Emitter', function () {
  describe('#object', function () {
    let remit

    before(function () {
      remit = Remit()
    })

    it('should be a function', function () {
      expect(remit.emit).to.be.a('function')
    })

    it('should expose "on" global function', function () {
      expect(remit.emit.on).to.be.a('function')
    })
  })

  describe('#return', function () {
    let remit, emitter

    before(function () {
      remit = Remit()
      emitter = remit.emit('foo')
    })

    it('should throw if no event given', function () {
      expect(remit.emit.bind(null)).to.throw('No/invalid event specified when creating an emission')
    })

    it('should return an Emitter', function () {
      expect(emitter).to.be.an.instanceof(remit.emit.Type)
    })

    it('should be runnable (#send)', function () {
      expect(emitter).to.be.a('function')
    })

    it('should expose an "on" function', function () {
      expect(emitter.on).to.be.a('function')
    })

    it('should expose an "options" function', function () {
      expect(emitter.options).to.be.a('function')
    })

    it('should expose a "ready" function', function () {
      expect(emitter.ready).to.be.a('function')
    })

    it('should expose a "send" function', function () {
      expect(emitter.send).to.be.a('function')
    })
  })

  // for this section, assume all other parts of the library
  // work and only test emission features
  describe('#usage', function (done) {
    let listenRemit1, listenRemit2, emitRemit

    before(async function () {
      const remit1 = Remit({name: 'listen1'})
      const remit2 = Remit({name: 'listen2'})
      listenRemit1 = remit1.listen('emit-usage').handler(() => {}).start()
      listenRemit2 = remit2.listen('emit-usage').handler(() => {}).start()
      emitRemit = Remit({name: 'emitRemit'})

      const [ r1, r2 ] = await Promise.all([listenRemit1, listenRemit2])

      listenRemit1 = r1
      listenRemit2 = r2
    })

    it('should parse timestrings in a delay option', function () {
      const emit = emitRemit.emit('options-timestring-test')
      emit.options({delay: '30m'})
      expect(emit._options).to.have.property('delay', 1800000)
      expect(emit._options).to.have.property('schedule', null)
      emit.options({delay: '2s'})
      expect(emit._options).to.have.property('delay', 2000)
      expect(emit._options).to.have.property('schedule', null)
    })

    it('should return promise on send that resolves on sent')
    it('should emit "sent" on sending')
    it('should add priority if given in options before send')
    it('should add priority if given in options at send')
    it('should only set options at send for one emission')
    it('should pass `null` as data if JSON unparsable')
    it('should throw if demission queue dies before sending')
    it('should throw if failing to set up demission queue')
    it('should throw if invalid delay given')
    it('should throw if invalid schedule given')
    it('should not set delay if less than 1ms')
    it('should not schedule if less than 1ms')

    it('should emit to all listeners', async function () {
      const op = Promise.all([
        waitForNext(listenRemit1),
        waitForNext(listenRemit2)
      ])

      const sentEvent = await emitRemit
        .emit('emit-usage')
        .send({foo: 'bar'})

      expect(sentEvent).to.have.property('eventType', 'emit-usage')
      expect(sentEvent).to.not.have.property('started')
      expect(sentEvent).to.have.property('eventId')
      expect(sentEvent).to.have.property('resource', 'emitRemit')
      expect(sentEvent).to.have.property('resourceTrace')
      expect(sentEvent).to.have.property('timestamp')
      expect(sentEvent.data.foo).to.equal('bar')
      // TODO test trace

      const events = await op

      expect(events).to.have.lengthOf(2)

      events.forEach((event) => {
        expect(event).to.have.property('started')
        expect(event.eventId).to.equal(sentEvent.eventId)
        expect(+event.timestamp).to.equal(+sentEvent.timestamp)
        expect(event.eventType).to.equal(sentEvent.eventType)
        expect(event.resource).to.equal(sentEvent.resource)
        expect(event.resourceTrace).to.equal(sentEvent.resourceTrace)
      })
    })

    it('should delay message by 1 seconds', async function () {
      this.slow(3000)

      const op = Promise.all([
        waitForNext(listenRemit1),
        waitForNext(listenRemit2)
      ])

      const sentEvent = await emitRemit
        .emit('emit-usage')
        .options({delay: 1000})
        .send({bar: 'baz'})

      expect(sentEvent).to.have.property('eventId')
      expect(sentEvent).to.not.have.property('started')
      expect(sentEvent).to.have.property('eventType', 'emit-usage')
      expect(sentEvent).to.have.property('resource', 'emitRemit')
      expect(sentEvent.data).to.have.property('bar', 'baz')
      expect(sentEvent).to.have.property('delay', 1000)
      expect(sentEvent).to.have.property('resourceTrace')
      expect(sentEvent).to.have.property('timestamp')

      const events = await op

      events.forEach((event) => {
        expect(event).to.have.property('started')
        expect(event.delay).to.equal(sentEvent.delay)
        expect(+event.timestamp).to.equal(+sentEvent.timestamp)
        expect(+event.started).to.be.above(+sentEvent.timestamp + sentEvent.delay)
        expect(event.eventId).to.equal(sentEvent.eventId)
        expect(event.eventType).to.equal(sentEvent.eventType)
        expect(event.resource).to.equal(sentEvent.resource)
        expect(event.data.bar).to.equal(sentEvent.data.bar)
        expect(event.resourceTrace).to.equal(sentEvent.resourceTrace)
      })
    })

    it('should schedule message for 2 seconds', async function () {
      this.timeout(5000)
      this.slow(5000)

      const op = Promise.all([
        waitForNext(listenRemit1),
        waitForNext(listenRemit2)
      ])

      let d = new Date()
      d.setSeconds(d.getSeconds() + 2)

      const sentEvent = await emitRemit
        .emit('emit-usage')
        .options({delay: d})
        .send({bar: 'baz'})

      expect(sentEvent).to.have.property('eventId')
      expect(sentEvent).to.not.have.property('started')
      expect(sentEvent).to.have.property('eventType', 'emit-usage')
      expect(sentEvent).to.have.property('resource', 'emitRemit')
      expect(sentEvent.data).to.have.property('bar', 'baz')
      expect(sentEvent).to.have.property('scheduled')
      expect(+sentEvent.scheduled).to.equal(+d)
      expect(sentEvent).to.have.property('resourceTrace')
      expect(sentEvent).to.have.property('timestamp')

      const events = await op

      events.forEach((event) => {
        expect(event).to.have.property('started')
        expect(event.schedule).to.equal(sentEvent.schedule)
        expect(+event.timestamp).to.equal(+sentEvent.timestamp)
        expect(+event.started).to.be.above(+sentEvent.scheduled)
        expect(event.eventId).to.equal(sentEvent.eventId)
        expect(event.eventType).to.equal(sentEvent.eventType)
        expect(event.resource).to.equal(sentEvent.resource)
        expect(event.data.bar).to.equal(sentEvent.data.bar)
        expect(event.resourceTrace).to.equal(sentEvent.resourceTrace)
      })
    })
  })
})

function waitForNext (instance) {
  return new Promise((resolve, reject) => {
    instance.on('data', (event) => {
      resolve(event)
    })
  })
}
