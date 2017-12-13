const treeDb = require('@crugo/connection-mongo')('tree')

//
// TODO
//
// JT had an awesome idea. This should, by default, emit to a 'remitrace' queue
// for consumption.
//
// The ability to change the queue name would be good, as well as being able
// to provide a custom logger which is sent the action and event.
//
function remitrace (remit, opts = {}) {
  remit.endpoint.on('received', track('ENDP RECV'))
  remit.endpoint.on('sent', track('ENDP SENT'))
  remit.listen.on('received', track('LIST RECV'))
  remit.request.on('received', track('REQU RECV'))
  remit.request.on('sent', track('REQU SENT'))
  remit.emit.on('sent', track('EMIT SENT'))
}

function track (action) {
  return (event) => {
    const doc = {
      originId: event.metadata.originId,
      bubbleId: event.metadata.bubbleId,
      fromBubbleId: event.metadata.fromBubbleId,
      transactionId: event.eventId,
      instanceId: event.metadata.instanceId,
      time: new Date(),
      action: action,
      event: event.eventType,
      service: event.resource,
      trace: event.resourceTrace
    }

    if (event.metadata.flowType) doc.flowType = event.metadata.flowType

    treeDb
      .collection('messages')
      .insertOne(doc)
  }
}

function buildStack (messages) {
  return messages.reduce((list, message) => {
    list.push(
      `${message.time.getTime()} - ${message.action} ${message.event} @ ${message.service}`
    )

    return list
  }, []).join('\n')
}

async function traceAll (originId) {
  return treeDb
    .collection('messages')
    .find({ originId })
    .sort([['time', 1]])
    .toArray()
}

async function trace (event) {
  const messages = [
    await treeDb
      .collection('messages')
      .findOne({instanceId: event.metadata.instanceId})
  ]

  if (!messages.length) {
    return messages
  }

  let initialQuery

  if (messages[0].flowType === 'entry') {
    initialQuery = {
      flowType: 'exit',
      bubbleId: messages[0].fromBubbleId,
      transactionId: messages[0].transactionId
    }
  } else {
    initialQuery = {
      flowType: 'entry',
      bubbleId: messages[0].bubbleId
    }
  }

  messages.push(...await walk(initialQuery))

  return messages
}

async function walk (query, messages = []) {
  const nextItem = await treeDb
    .collection('messages')
    .findOne(query)

  if (!nextItem) {
    return messages
  }

  messages.push(nextItem)

  if (!nextItem.bubbleId) {
    return messages
  }

  const nextQuery = nextItem.flowType === 'entry' ? {
    flowType: 'exit',
    bubbleId: nextItem.fromBubbleId,
    transactionId: nextItem.transactionId
  } : {
    flowType: 'entry',
    bubbleId: nextItem.bubbleId
  }

  return walk(nextQuery, messages)
}

module.exports.remitrace = remitrace
module.exports.buildStack = buildStack
module.exports.trace = trace
module.exports.traceAll = traceAll

// 01C17V0JNF7479PHEF6SZ841Q5
