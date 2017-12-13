const { getNamespace } = require('cls-hooked')
const { ulid } = require('ulid')

function parseEvent (properties = {}, fields = {}, data, isCustom, grabBubbleId, what, flowType) {
  const event = {
    eventId: properties.messageId,
    eventType: fields.routingKey,
    resource: properties.appId,
    data: data,
    metadata: {
      instanceId: ulid()
    }
  }

  if (!isCustom) {
    event.started = new Date()
  }

  if (flowType) {
    event.metadata.flowType = flowType
  }

  if (what) {
    event.metadata.bubbleId = properties.headers.fromBubbleId
    event.metadata.fromBubbleId = properties.headers.bubbleId
  } else if (grabBubbleId) {
    event.metadata.fromBubbleId = properties.headers.fromBubbleId
  }

  if (properties.headers) {
    event.metadata.originId = properties.headers.originId || null

    if (properties.headers.uuid) {
      event.eventId = properties.headers.uuid
    }

    // event.fromId = properties.headers.fromId || event.eventId || null
    if (!what) {
      const ns = getNamespace('remit-breadcrumbs')
      event.metadata.bubbleId = ns.get('bubbleId') || null
    }
    // event.fromBubbleId = properties.headers.bubbleId

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
