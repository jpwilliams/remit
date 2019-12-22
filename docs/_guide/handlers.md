---
layout: default
title:  Handlers
order: 3
---
# Handlers

Endpoints and Listeners (receivers) use handlers to reply to or, uh, handle incoming messages. In both cases, these are functions or values that can be passed when creating the receiver or added/changed real-time by using the `.handler()` method.

If a handler is a value (i.e. not a function) then it will be returned as the data of a successful response. This is useful for simple endpoints that just need to return static or just simple mutable values.

All handler _functions_ are passed two items: `event` and `callback`. If `callback` is mapped in your handler, you will need to call it to indicate success/failure (see [Handling completion](#) below). If you do not map a callback, you can reply synchronously or by returning a Promise.

Handlers are used for determining when a message has been successfully dealt with. Internally, Remit uses this to ascertain when to draw more messages in from the queue and, in the case of Listeners, when to remove the message from the server.

RabbitMQ gives an at-least-once delivery guarantee, meaning that, ideally, receivers are idempotent. If a service dies before it has successfully returned from a handler, all messages it was processing will be passed back to the server and distributed to another service (or the same service once it reboots).

## Simple returns

Here, we create a simple endpoint that returns `{"foo": "bar"}` whenever called:

``` js
const endpoint = await remit
	.endpoint('foo.bar', () => {
		return { foo: 'bar' }
	})
	.start()
```

## Incoming data

We can also parse incoming data and gather information on the request by using the given `event` object.

``` js
const endpoint = await remit
	.endpoint('foo.bar', (event) => {
		console.log(event)

		return { foo: 'bar' }
	})
	.start()
```

When called by a `'foo.bar'` request, the above Endpoint will log out the event it's been passed before returning the data `{"foo": "bar"}`. Here's an example of an event object:

``` js
{
	/** string - The unique ID of the message. Also serves as RabbitMQ's
	 * internal correlation ID. */
	"eventId": "01DV3GY7T31QRV6Q5QAWG1BKZB",

	/** string - The routing key that the message used. */
	"eventType": 'foo.bar',

	/** string - The `name` of the Remit instance that sent this message. */
	"resource": "test-service",

	/** any - The data contained within the event. */
	"data": { "userId": 123 },

	/** Date - The time at which the message was served to a handler after
	 * being pulled from the server and parsed. */
	"started": 2019-12-02T14:43:59.470Z,

	/** Date - The Date at which the message was originally sent. */
	"timestamp": 2019-12-02T14:43:59.392Z
}
```

Event objects can also contain a few optional properties:

``` js
/** If the message was scheduled for a specific time, this is the Date
 * for which it was scheduled. */
scheduled?: Date

/** If the message was intended to be delayed, this is the amount of time
 * (in milliseconds) that it was intended to be delayed for. */
delay?: number

/** The file and line number that the message was triggered from. This
 * could be a file at another process. */
resourceTrace?: string
```

## Handling completion

Handlers provide you with four different ways of showing completion: Promises, callbacks, a synchronous call, or a straight value. To decide what the handler should treat as a successful result, Remit follows the following pattern:

```
if handler is not a function:
├── Return handler value
else if handler does not map second (callback) property:
├── if handler returns a promise:
│   └── Watch resolution/rejection of result
│   else:
│   └── Return synchronous result
else:
└── Wait for callback to be called
```

In any case, if an exception is thrown or an error is passed as the first value to the callback, then the error is passed back to the requester (if an endpoint) or the message sent to a dead-letter queue (if a listener).

## Middleware

You can provide multiple handlers in a sequence to act as middleware, similar to that of Express's. Every handler in the line is passed the same `event` object, so to pass data between the handlers, mutate that.

A common use case for middleware is validation. Here, a middleware handler adds a property to incoming data before continuing:

``` js
const authMiddleware = (event) => {
	event.user = { name: 'Jack' }
}

const mainHandler = (event) => {
	console.log(event)

	return true
}

const endpoint = await remit
	.endpoint('foo.bar')
	.handler(authMiddleware, mainHandler)
	.start()
```

When using middleware, it's important to know how to break the chain if you need to. If anything other than `undefined` is returned in any handler (middleware or otherwise via a Promise/callback/sync call), the chain will break and that data will be returned to the requester.

If an exception is thrown at any point, the chain will also break and the error will be returned to the requester.

This means you can fall out of chains early. Let's say we want to fake an empty response for user #21:

``` js
// If the userId is 21, we'll immediately return an empty array.
const filterMiddleware = (event) => {
	if (event.data.userId === 21) {
		return []
    }
}

const mainHandler = (event) => {
	return calculateuserList()
}

const endpoint = await remit
	.endpoint('user.list')
	.handler(filterMiddleware, mainHandler)
	.start()
```

Or perhaps exit if a call is done with no authorisation token:

``` js
// If no auth token is given, we pass an error back to the requestor.
// Otherwise, decode it and use it in the main handler.
const authMiddleware = (event) => {
	if (!event.data.authToken) {
		throw new Error('No authorisation token given')
	}

	event.data.decodedToken = await decodeAuthToken(event.data.authToken)
}

const mainHandler = (event) => {
	return performGuardedCallWithUser(event.data.decodedToken.uid)
}

const endpoint = await remit
	.endpoint('user.changePassword')
	.handler(authMiddleware, mainHandler)
	.start()
```
