/* global describe, it, before, expect */
const Remit = require('../')
const EventEmitter = require('eventemitter3')
const eventWatcher = new EventEmitter()

const remitems = {
  request: null,
  endpoint: null,
  emit: null,
  listener: null
}

function watchEvents (key) {
  ;(['data', 'sent'].forEach((type) => {
    remitems[key].on(type, eventWatcher.emit.bind(eventWatcher, `${key}-${type}`))
  }))
}

function waitForNext (key, type) {
  return new Promise((resolve) => {
    eventWatcher.once(`${key}-${type}`, resolve)
  })
}

async function fullCycle (includeEmit) {
  if (includeEmit) {
    remitems.endpoint.handler(async () => {
      await remitems.emit()

      return 'handled'
    })
  }

  const requestSentOp = waitForNext('request', 'sent')
  const endpointRecvOp = waitForNext('endpoint', 'data')
  const endpointSentOp = waitForNext('endpoint', 'sent')
  const requestRecvOp = waitForNext('request', 'data')
  const emitSentOp = includeEmit ? waitForNext('emit', 'sent') : Promise.resolve()
  const listenerRecvOp = includeEmit ? waitForNext('listener', 'data') : Promise.resolve()

  remitems.request()

  const [
    requestSent,
    endpointRecv,
    endpointSent,
    requestRecv,
    emitSent,
    listenerRecv
  ] = await Promise.all([
    requestSentOp,
    endpointRecvOp,
    endpointSentOp,
    requestRecvOp,
    emitSentOp,
    listenerRecvOp
  ])

  if (includeEmit) {
    remitems.endpoint.handler('handled')
  }

  return {
    requestSent,
    endpointRecv,
    endpointSent,
    requestRecv,
    emitSent,
    listenerRecv
  }
}

describe('Tracing', function () {
  describe('#params', function () {
    before(async function () {
      const remit = Remit()

      // set up each type
      remitems.request = remit.request('tracing-req')
      remitems.endpoint = remit.endpoint('tracing-req').handler('handled')
      remitems.emit = remit.emit('tracing-emit')
      remitems.listener = remit.listen('tracing-emit').handler(() => {})

      // add listeners for tests
      Object.keys(remitems).forEach(watchEvents)

      // boot
      return Promise.all([
        remitems.endpoint.start(),
        remitems.listener.start()
      ])
    })

    it('should have suitable exit metadata for requests', async function () {
      const op = waitForNext('request', 'sent')
      remitems.request()
      const event = await op

      expect(event).to.be.an('object')
      expect(event).to.have.property('eventId')
      expect(event.eventId).to.be.a('string')
      expect(event).to.have.property('metadata')
      expect(event.metadata).to.be.an('object')
      expect(event.metadata).to.have.property('instanceId')
      expect(event.metadata.instanceId).to.be.a('string')
      expect(event.metadata).to.have.property('flowType', 'exit')
      expect(event.metadata).to.have.property('originId', event.eventId)
      expect(event.metadata).to.have.property('fromBubbleId', null)
      expect(event.metadata).to.have.property('bubbleId', null)
    })

    it('should have suitable entry metadata for endpoints', async function () {
      const op = waitForNext('endpoint', 'data')
      remitems.request()
      const event = await op

      expect(event).to.be.an('object')
      expect(event).to.have.property('eventId')
      expect(event.eventId).to.be.a('string')
      expect(event).to.have.property('metadata')
      expect(event.metadata).to.be.an('object')
      expect(event.metadata).to.have.property('instanceId')
      expect(event.metadata.instanceId).to.be.a('string')
      expect(event.metadata).to.have.property('flowType', 'entry')
      expect(event.metadata).to.have.property('originId', event.eventId)
      expect(event.metadata).to.have.property('fromBubbleId', null)
      expect(event.metadata).to.have.property('bubbleId')
      expect(event.metadata.bubbleId).to.be.a('string')
    })

    it('should have suitable exit metadata for emissions', async function () {
      const op = waitForNext('emit', 'sent')
      remitems.emit()
      const event = await op

      expect(event).to.be.an('object')
      expect(event).to.have.property('eventId')
      expect(event.eventId).to.be.a('string')
      expect(event).to.have.property('metadata')
      expect(event.metadata).to.be.an('object')
      expect(event.metadata).to.have.property('instanceId')
      expect(event.metadata.instanceId).to.be.a('string')
      expect(event.metadata).to.have.property('flowType', 'exit')
      expect(event.metadata).to.have.property('originId', event.eventId)
      expect(event.metadata).to.have.property('fromBubbleId', null)
      expect(event.metadata).to.have.property('bubbleId', null)
    })

    it('should have suitable entry metadata for listeners', async function () {
      const op = waitForNext('listener', 'data')
      remitems.emit()
      const event = await op

      expect(event).to.be.an('object')
      expect(event).to.have.property('eventId')
      expect(event.eventId).to.be.a('string')
      expect(event).to.have.property('metadata')
      expect(event.metadata).to.be.an('object')
      expect(event.metadata).to.have.property('instanceId')
      expect(event.metadata.instanceId).to.be.a('string')
      expect(event.metadata).to.have.property('flowType', 'entry')
      expect(event.metadata).to.have.property('originId', event.eventId)
      expect(event.metadata).to.have.property('fromBubbleId', null)
      expect(event.metadata).to.have.property('bubbleId')
      expect(event.metadata.bubbleId).to.be.a('string')
    })
  })

  describe('#correlation', function () {
    it('should have unique instance IDs for every action', async function () {
      const allActions = await fullCycle(true)

      const map = Object.keys(allActions).reduce((map, key) => {
        map[allActions[key].metadata.instanceId] = true

        return map
      }, {})

      expect(Object.keys(map)).to.have.lengthOf(Object.keys(allActions).length)
    })

    it('should set correlative properties from origin request to endpoint', async function () {
      const {
        requestSent,
        endpointRecv,
        endpointSent,
        requestRecv
      } = await fullCycle()

      // check sent req
      expect(requestSent).to.be.an('object')
      expect(requestSent).to.have.property('metadata')
      expect(requestSent.metadata).to.be.an('object')
      expect(requestSent.metadata).to.have.property('flowType', 'exit')
      expect(requestSent.metadata).to.have.property('originId', requestSent.eventId)
      expect(requestSent.metadata).to.have.property('fromBubbleId', null)
      expect(requestSent.metadata).to.have.property('bubbleId', null)

      // save this for later
      const eventId = requestSent.eventId
      const originId = requestSent.metadata.originId

      // check endpoint recv
      expect(endpointRecv).to.be.an('object')
      expect(endpointRecv).to.have.property('eventId', eventId)
      expect(endpointRecv).to.have.property('metadata')
      expect(endpointRecv.metadata).to.be.an('object')
      expect(endpointRecv.metadata).to.have.property('flowType', 'entry')
      expect(endpointRecv.metadata).to.have.property('originId', originId)
      expect(endpointRecv.metadata).to.have.property('fromBubbleId', null)
      expect(endpointRecv.metadata).to.have.property('bubbleId')
      expect(endpointRecv.metadata.bubbleId).to.be.a('string')

      // check endpoint send
      expect(endpointSent).to.be.an('object')
      expect(endpointSent).to.have.property('eventId', eventId)
      expect(endpointSent).to.have.property('metadata')
      expect(endpointSent.metadata).to.be.an('object')
      expect(endpointSent.metadata).to.not.have.property('flowType')
      expect(endpointSent.metadata).to.have.property('originId', originId)
      expect(endpointSent.metadata).to.have.property('fromBubbleId', null)
      expect(endpointSent.metadata).to.have.property('bubbleId', endpointRecv.metadata.bubbleId)

      // check req recv
      expect(requestRecv).to.be.an('object')
      expect(requestRecv).to.have.property('eventId', eventId)
      expect(requestRecv).to.have.property('metadata')
      expect(requestRecv.metadata).to.be.an('object')
      expect(requestRecv.metadata).to.not.have.property('flowType')
      expect(requestRecv.metadata).to.have.property('originId', originId)
      expect(requestRecv.metadata).to.have.property('bubbleId', endpointSent.metadata.fromBubbleId)
      expect(requestRecv.metadata).to.have.property('fromBubbleId', endpointSent.metadata.bubbleId)
    })

    it('should correlate mixed types through a full chain', async function () {
      const {
        requestSent,
        endpointRecv,
        endpointSent,
        requestRecv,
        emitSent,
        listenerRecv
      } = await fullCycle(true)

      // check sent req
      expect(requestSent).to.be.an('object')
      expect(requestSent).to.have.property('metadata')
      expect(requestSent.metadata).to.be.an('object')
      expect(requestSent.metadata).to.have.property('flowType', 'exit')
      expect(requestSent.metadata).to.have.property('originId', requestSent.eventId)
      expect(requestSent.metadata).to.have.property('fromBubbleId', null)
      expect(requestSent.metadata).to.have.property('bubbleId', null)

      // save this for later
      const reqEventId = requestSent.eventId
      const originId = requestSent.metadata.originId

      // check endpoint recv
      expect(endpointRecv).to.be.an('object')
      expect(endpointRecv).to.have.property('eventId', reqEventId)
      expect(endpointRecv).to.have.property('metadata')
      expect(endpointRecv.metadata).to.be.an('object')
      expect(endpointRecv.metadata).to.have.property('flowType', 'entry')
      expect(endpointRecv.metadata).to.have.property('originId', originId)
      expect(endpointRecv.metadata).to.have.property('fromBubbleId', null)
      expect(endpointRecv.metadata).to.have.property('bubbleId')
      expect(endpointRecv.metadata.bubbleId).to.be.a('string')

      // check emission send
      expect(emitSent).to.be.an('object')
      expect(emitSent).to.have.property('eventId')
      expect(emitSent.eventId).to.be.a('string')
      expect(emitSent.eventId).to.not.equal(reqEventId)
      expect(emitSent).to.have.property('metadata')
      expect(emitSent.metadata).to.be.an('object')
      expect(emitSent.metadata).to.have.property('flowType', 'exit')
      expect(emitSent.metadata).to.have.property('originId', originId)
      expect(emitSent.metadata).to.have.property('fromBubbleId')
      expect(emitSent.metadata).to.have.property('bubbleId')
      expect(emitSent.metadata.bubbleId).to.equal(emitSent.metadata.fromBubbleId)
      expect(emitSent.metadata.bubbleId).equal(endpointRecv.metadata.bubbleId)

      // check listener recv
      expect(listenerRecv).to.be.an('object')
      expect(listenerRecv).to.have.property('eventId', emitSent.eventId)
      expect(listenerRecv).to.have.property('metadata')
      expect(listenerRecv.metadata).to.be.an('object')
      expect(listenerRecv.metadata).to.have.property('flowType', 'entry')
      expect(listenerRecv.metadata).to.have.property('originId', originId)
      expect(listenerRecv.metadata).to.have.property('fromBubbleId', emitSent.metadata.bubbleId)
      expect(listenerRecv.metadata).to.have.property('bubbleId')
      expect(listenerRecv.metadata.bubbleId).to.be.a('string')
      expect(listenerRecv.metadata.bubbleId).to.not.equal(emitSent.metadata.bubbleId)

      // check endpoint send
      expect(endpointSent).to.be.an('object')
      expect(endpointSent).to.have.property('eventId', reqEventId)
      expect(endpointSent).to.have.property('metadata')
      expect(endpointSent.metadata).to.be.an('object')
      expect(endpointSent.metadata).to.not.have.property('flowType')
      expect(endpointSent.metadata).to.have.property('originId', originId)
      expect(endpointSent.metadata).to.have.property('fromBubbleId', null)
      expect(endpointSent.metadata).to.have.property('bubbleId', endpointRecv.metadata.bubbleId)

      // check req recv
      expect(requestRecv).to.be.an('object')
      expect(requestRecv).to.have.property('eventId', reqEventId)
      expect(requestRecv).to.have.property('metadata')
      expect(requestRecv.metadata).to.be.an('object')
      expect(requestRecv.metadata).to.not.have.property('flowType')
      expect(requestRecv.metadata).to.have.property('originId', originId)
      expect(requestRecv.metadata).to.have.property('bubbleId', endpointSent.metadata.fromBubbleId)
      expect(requestRecv.metadata).to.have.property('fromBubbleId', endpointSent.metadata.bubbleId)
    })
  })
})
