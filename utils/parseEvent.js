const { getNamespace } = require('cls-hooked')

function parseEvent (properties = {}, fields = {}, data, isCustom, grabBubbleId, what) {
  const event = {
    eventId: properties.messageId,
    eventType: fields.routingKey,
    resource: properties.appId,
    data: data
  }

  if (!isCustom) {
    event.started = new Date()
  }

  if (what) {
    event.bubbleId = properties.headers.fromBubbleId
    event.fromBubbleId = properties.headers.bubbleId
  } else if (grabBubbleId) {
    event.fromBubbleId = properties.headers.fromBubbleId
  }

  if (properties.headers) {
    event.originId = properties.headers.originId || null

    if (properties.headers.uuid) {
      event.eventId = properties.headers.uuid
    }

    // event.fromId = properties.headers.fromId || event.eventId || null
    if (!what) {
      const ns = getNamespace('remit-breadcrumbs')
      event.bubbleId = ns.get('bubbleId') || null
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
