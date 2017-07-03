function parseEvent (properties = {}, fields = {}, data = {}) {
  let event = {
    started: new Date(),
    eventId: properties.messageId,
    eventType: fields.routingKey,
    resource: properties.appId,
    data: data
  }

  if (properties.headers) {
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
    if (properties.timestamp.toString().length === 10) {
      properties.timestamp *= 1000
    }

    event.timestamp = new Date(properties.timestamp)
  }

  return event
}
