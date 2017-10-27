function parseEvent (properties = {}, fields = {}, data, isCustom) {
  const event = {
    eventId: properties.messageId,
    eventType: fields.routingKey,
    resource: properties.appId,
    data: data
  }

  if (!isCustom) {
    event.started = new Date()
  }

  if (properties.headers) {
    event.crumbs = properties.headers.crumbs || []

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
