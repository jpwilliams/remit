const { getNamespace } = require('cls-hooked')
const { ulid } = require('ulid')
const bubble = require('../utils/bubble')

function parseEvent (properties = {}, fields = {}, data, opts = {}) {
  const event = {
    eventId: properties.messageId,
    eventType: fields.routingKey,
    resource: properties.appId,
    data: data,
    metadata: {
      instanceId: ulid()
    }
  }

  if (opts.flowType) {
    event.metadata.flowType = opts.flowType
  }

  if (properties.headers) {
    event.metadata.originId = properties.headers.originId

    if (opts.switchBubbles) {
      event.metadata.bubbleId = properties.headers.fromBubbleId
      event.metadata.fromBubbleId = properties.headers.bubbleId
    } else {
      event.metadata.fromBubbleId = properties.headers.fromBubbleId
      event.metadata.bubbleId = bubble.get('bubbleId') || null
    }

    if (properties.headers.uuid) {
      event.eventId = properties.headers.uuid
    }

    if (properties.headers.scheduled) {
      event.scheduled = new Date(properties.headers.scheduled)
    }

    if (properties.headers.delay) {
      event.delay = properties.headers.delay
    }

    if (properties.headers.trace) {
      event.resourceTrace = properties.headers.trace
    }
  }

  if (properties.timestamp) {
    let timestamp = properties.timestamp

    if (timestamp.toString().length === 10) {
      timestamp *= 1000
    }

    event.timestamp = new Date(timestamp)
  }

  return event
}

module.exports = parseEvent
