# @jpwilliams/remit

[![Build Status](https://travis-ci.org/jpwilliams/remit.svg?branch=master)](https://travis-ci.org/jpwilliams/remit) [![Coverage Status](https://coveralls.io/repos/github/jpwilliams/remit/badge.svg?branch=master)](https://coveralls.io/github/jpwilliams/remit?branch=master) [![npm downloads per month](https://img.shields.io/npm/dm/@jpwilliams/remit.svg)](https://www.npmjs.com/package/@jpwilliams/remit) [![npm version](https://img.shields.io/npm/v/@jpwilliams/remit.svg)](https://www.npmjs.com/package/@jpwilliams/remit) [![OpenTracing Badge](https://img.shields.io/badge/OpenTracing-enabled-blue.svg)](http://opentracing.io) [![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fjpwilliams%2Fremit.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fjpwilliams%2Fremit?ref=badge_shield)

A wrapper for RabbitMQ for communication between microservices. No service discovery needed.

``` sh
npm install @jpwilliams/remit
```

``` js
// user service
const Remit = require('@jpwilliams/remit')
const remit = Remit({ name: 'user-service' })

remit
  .endpoint('user')
  .handler((event) => {
    return {
      name: 'Jack Williams',
      email: 'jpwilliamsphotography@gmail.com'
    }
  })
  .start()
```

``` js
// an api
const Remit = require('@jpwilliams/remit')
const remit = Remit({ name: 'api' })

const getUser = remit.request('user')
const user = await getUser(123)
console.log(user)

/* {
  name: 'Jack Williams',
  email: 'jpwilliamsphotography@gmail.com'
} */
```

---

## What's remit?

A simple wrapper over [RabbitMQ](http://www.rabbitmq.com) to provide [RPC](https://en.wikipedia.org/wiki/Remote_procedure_call) and [ESB](https://en.wikipedia.org/wiki/Enterprise_service_bus)-style behaviour.

It supports **request/response** calls (e.g. requesting a user's profile), **emitting events** to the entire system (e.g. telling any services interested that a user has been created) and basic **scheduling** of messages (e.g. recalculating something every 5 minutes), all **load balanced** across grouped services and redundant; if a service dies, another will pick up the slack.

There are four types you can use with Remit.

* [request](#), which fetches data from an [endpoint](#)
* [emit](#), which emits data to [listen](#)ers

Endpoints and listeners are grouped by "Service Name" specified as `name` or the environment variable `REMIT_NAME` when creating a Remit instance. This grouping means only a single consumer in that group will receive a message. This is used for scaling services: when creating multiple instances of a service, make sure they all have the same name.

---

## Quick start

First, import the `Remit` constructor.

``` js
const Remit = require('@jpwilliams/remit')
```

Now let's 

---

## API/Usage

- [@jpwilliams/remit](#jpwilliamsremit)
	- [What's remit?](#whats-remit)
	- [Quick start](#quick-start)
	- [API/Usage](#apiusage)
			- [`request(event)`](#requestevent)
			- [`request.on(eventName, listener)`](#requestoneventname-listener)
			- [`request.fallback(data)`](#requestfallbackdata)
			- [`request.options(options)`](#requestoptionsoptions)
			- [`request.ready()`](#requestready)
			- [`request.send([data[, options]])`](#requestsenddata-options)
			- [`endpoint(event[, ...handlers])`](#endpointevent-handlers)
			- [`endpoint.handler(...handlers)`](#endpointhandlerhandlers)
			- [`endpoint.on(eventName, listener)`](#endpointoneventname-listener)
			- [`endpoint.options(options)`](#endpointoptionsoptions)
			- [`endpoint.start()`](#endpointstart)
			- [`endpoint.pause([cold])`](#endpointpausecold)
			- [`endpoint.resume()`](#endpointresume)
			- [`emit.on(eventName, listener)`](#emitoneventname-listener)
			- [`emit.options(options)`](#emitoptionsoptions)
			- [`emit.ready()`](#emitready)
			- [`emit.send([data[, options]])`](#emitsenddata-options)
			- [`listen.handler(...handlers)`](#listenhandlerhandlers)
			- [`listen.on(eventName, listener)`](#listenoneventname-listener)
			- [`listen.options(options)`](#listenoptionsoptions)
			- [`listen.start()`](#listenstart)
			- [`listen.pause([cold])`](#listenpausecold)
			- [`listen.resume()`](#listenresume)
	- [Events](#events)
	- [Handlers](#handlers)
			- [Simple returns](#simple-returns)
			- [Incoming data](#incoming-data)
			- [Event object](#event-object)
			- [Handling completion](#handling-completion)
			- [Middleware](#middleware)
	- [Tracing](#tracing)
	- [License](#license)

---

#### `request(event)`

* `event` &lt;string&gt; | &lt;Object&gt;

Create a new request for data from an [endpoint](#) by calling the event dictated by `event`. If an object is passed, `event` is required. See [`request.options`](#) for available options.

``` js
remit.request('foo.bar')
```

`timeout` and `priority` are explained and can be changed at any stage using [`request.options()`](#).

The request is sent by running the returned function (synonymous with calling `.send()`), passing the data you wish the make the request with.

For example, to retrieve a user from the `'user.profile'` endpoint using an ID:

``` js
const getUserProfile = remit.request('user.profile')
const user = await getUserProfile(123)
console.log(user)
// prints the user's data
```

Returns a new request.

#### `request.on(eventName, listener)`

* `eventName` &lt;any&gt;
* `listener` &lt;Function&gt;

Subscribe to this request's dumb EventEmitter. For more information on the events emitted, see the [Events](#) section.

Returns a reference to the `request`, so that calls can be chained.

#### `request.fallback(data)`

* `data` &lt;any&gt;

Specifies data to be returned if a request fails for any reason. Can be used to gracefully handle failing calls across multiple requests. When a fallback is set, any request that fails will instead resolve successfully with the data passed to this function.

``` js
const request = remit
  .request('user.list')
  .fallback([])
```

The error is still sent over the request's EventEmitter, so listening to `'error'` lets you handle the error however you wish.

You can change the fallback at any point in a request's life and unset it by passing no arguments to the function.

Returns a reference to the `request`, so that calls can be chained.

#### `request.options(options)`

* `options` &lt;Object&gt;
  * `event` &lt;string&gt; **Required**
  * `timeout` &lt;integer&gt; **Default:** `30000`
  * `priority` &lt;integer&gt; **Default:** `0`

Set various options for the request. Can be done at any point in a request's life but will not affect timeouts in which requests have already been sent.

``` js
const request = remit
  .request('foo.bar')
  .options({
    timeout: 5000
  })
```

Settings `timeout` to `0` will result in there being no timeout. Otherwise it is the amount of time in milliseconds to wait before declaring the request "timed out".

`priority` can be an integer between `0` and `10`. Higher priority requests will go to the front of queues over lower priority requests.

Returns a reference to the `request`, so that calls can be chained.

#### `request.ready()`

Returns a promise which resolves when the request is ready to make calls.

``` js
const request = await remit
  .request('foo.bar')
  .ready()
```

Any calls made before this promise is resolved will be automatically queued until it is.

Returns a reference to the `request`, so that calls can be chained.

#### `request.send([data[, options]])`

_Synonymous with `request([data[, options]])`_

* `data` &lt;any&gt; **Default:** `null`
* `options` &lt;Object&gt;

Sends a request. `data` can be anything that plays nicely with [JSON.stringify](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify). If `data` is not defined, `null` is sent (`undefined` cannot be parsed into JSON).

``` js
const getUser = remit.request('user.getProfile')

// either of these perform the same action
const user = await getUser(123)
const user = await getUser.send(123)
```

`options` can contain anything provided in [`request.options`](#), but the options provided will only apply to that single request.

Returns a promise that resolves with data if the request was successful or rejects with an error if not. Always resolves if a [fallback](#) is set.

---

#### `endpoint(event[, ...handlers])`

* `event` &lt;string&gt; | &lt;Object&gt;
* `...handlers` &lt;Function&gt;

Creates an endpoint that replies to [`request`](#)s.

`event` is the code requests will use to call the endpoint. If an object is passed, `event` is required. For available options, see [`endpoint.options`](#).

``` js
const endpoint = await remit
  .endpoint('foo.bar', console.log)
  .start()
```

[`start()`](#) must be called on an endpoint to "boot it up" ready to receive requests. An endpoint that's started without a `handler` (a function or series of functions that returns data to send back to a request) will throw. You can set handlers here or using [`endpoint.handler`](#). To learn more about handlers, check the [Handlers](#) section.

Returns a new endpoint.

#### `endpoint.handler(...handlers)`

* `...handlers` &lt;Function&gt;

Set the handler(s) for this endpoint. Only one series of handlers can be active at a time, though the active handlers can be changed using this call at any time.

``` js
const endpoint = remit.endpoint('foo.bar')
endpoint.handler(logRequest, sendFoo)
endpoint.start()
```

For more information on handlers, see the [Handlers](#) section.

Returns a reference to the `endpoint`, so that calls can be chained.

#### `endpoint.on(eventName, listener)`

* `eventName` &lt;any&gt;
* `listener` &lt;Function&gt;

Subscribe to this endpoint's dumb EventEmitter. For more information on the events emitted, see the [Events](#) section.

Returns a reference to the `endpoint`, so that calls can be chained.

#### `endpoint.options(options)`

#### `endpoint.start()`

#### `endpoint.pause([cold])`

* `cold` &lt;Boolean&gt;

Pauses consumption of messages for this endpoint. By default, any messages currently in memory will be processed (a "warm" pause). If `cold` is provided as truthy, any messages in memory will be pushed back to RabbitMQ.

Has no effect if the endpoint is already paused or has not yet been started.

Returns a promise that resolves with the endpoint when consumption has been successfully paused.

#### `endpoint.resume()`

Resumes consumption of messages for this endpoint after being paused using [`pause()`](#). If run on an endpoint that is not yet started, the endpoint will attempt to start.

Returns a promise that resolves with the endpoint when consumption has been successfully resumed.

----

#### `emit.on(eventName, listener)`

* `eventName` &lt;any&gt;
* `listener` &lt;Function&gt;

Subscribe to this emitter's dumb EventEmitter. For more information on the events emitted, see the [Events](#) section.

Returns a reference to the `emit`, so that calls can be chained.

#### `emit.options(options)`

#### `emit.ready()`

#### `emit.send([data[, options]])`

---

#### `listen.handler(...handlers)`

#### `listen.on(eventName, listener)`

* `eventName` &lt;any&gt;
* `listener` &lt;Function&gt;

Subscribe to this listener's dumb EventEmitter. For more information on the events emitted, see the [Events](#) section.

Returns a reference to the `listen`, so that calls can be chained.

#### `listen.options(options)`

#### `listen.start()`

#### `listen.pause([cold])`

* `cold` &lt;Boolean&gt;

Pauses consumption of messages for this listener. By default, any messages currently in memory will be processed (a "warm" pause). If `cold` is provided as truthy, any messages in memory will be pushed back to RabbitMQ.

Has no effect if the listener is already paused or has not yet been started.

Returns a promise that resolves with the listener when consumption has been successfully paused.

#### `listen.resume()`

Resumes consumption of messages for this listener after being paused using [`pause()`](#). If run on a listener that is not yet started, the listener will attempt to start.

Returns a promise that resolves with the listener when consumption has been successfully resumed.

---

## Events

[`request`](#), [`endpoint`](#), [`emit`](#) and [`listen`](#) all export EventEmitters that emit events about their incoming/outgoing messages.

All of the events can be listened to by using the `.on()` function, providing an `eventName` and a `listener` function, like so:

``` js
const request = remit.request('foo.bar')
const endpoint = remit.endpoint('foo.bar')
const emit = remit.emit('foo.bar')
const listen = remit.listen('foo.bar')

request.on('...', ...)
endpoint.on('...', ...)
emit.on('...', ...)
listen.on('...', ...)
```

Events can also be listened to _globally_, by adding a listener directly to the type. This listener will receive events for all instances of that type. This makes it easier to introduce centralised logging to remit's services.

``` js
remit.request.on('...', ...)
remit.endpoint.on('...', ...)
remit.emit.on('...', ...)
remit.listen.on('...', ...)
```

The following events can be listened to:

| Event | Description | Returns | request | endpoint | emit | listen |
| ----- | ----------- | ------- |  :---:  |   :---:  | :---: | :---: |
| `data` | Data was received | Raw data | ✅ | ✅ | ❌ | ✅ |
| `error` | An error occured or was passed back from an endpoint | Error | ✅ | ✅ | ✅ | ✅ |
| `sent` | Data was sent | The event that was sent | ✅ | ✅ | ✅ | ❌ |
| `success` | The action was successful | The successful result/data | ✅ | ✅ | ✅ | ✅ |
| `timeout` | The request timed out | A [timeout object](#) | ✅ | ❌ | ❌ | ❌ |

## Handlers

[Endpoints](#) and [listeners](#) use handlers to reply to or, uh, handle incoming messages. In both cases, these are functions or values that can be passed when creating the listener or added/changed real-time by using the `.handler()` method.

If a handler is a value (i.e. not a function) then it will be returned as the data of a successful response. This is useful for simple endpoints that just need to return static or just simple mutable values.

All handler _functions_ are passed two items: `event` and `callback`. If `callback` is mapped, you will need to call it to indicate success/failure (see [Handling completion](#) below). If you do not map a callback, you can reply synchronously or by returning a Promise.

Handlers are used for determining when a message has been successfully dealt with. Internally, Remit uses this to ascertain when to draw more messages in from the queue and, in the case of listeners, when to remove the message from the server.

RabbitMQ gives an at-least-once delivery guarantee, meaning that, ideally, listeners are idempotent. If a service dies before it has successfully returned from a handler, all messages it was processing will be passed back to the server and distributed to another service (or the same service once it reboots).

#### Simple returns

Here, we create a simple endpoint that returns `{"foo": "bar"}` whenever called:

``` js
const endpoint = await remit
  .endpoint('foo.bar', () => {
    return {foo: 'bar'}
  })
  .start()
```

#### Incoming data

We can also parse incoming data and gather information on the request by using the given `event` object.

``` js
const endpoint = await remit
  .endpoint('foo.bar', (event) => {
    console.log(event)
  })
  .start()
```

#### Event object

When called, the above will log out the event it's been passed. Here's an example of an event object:

``` js
{
  started: <Date>, // time the message was taken from the server
  eventId: <UID>, // a unique ID for the message (useful for idempotency purposes)
  eventType: 'foo.bar', // the eventName used to call this endpoint/listener (useful when using wildcard listeners)
  resource: 'service-user', // the name of the service that called/emitted this
  data: {userId: 123}, // the data sent with the request
  timestamp: <Date>, // the time the message was created

  // extraneous information, currently containing tracing data
  metadata: {
    originId: <UID>, // the ID of the initial request or emission that started the entire chain of calls - every call in a chain will have the same ID here
    bubbleId: <UID or NULL>, // the "bubble" (see more below) that the action happened in
    fromBubbleId: <UID or NULL>, // the "bubble" (see more below) that the action was triggered from
    instanceId: <UID>, // a unique ID for every action
    flowType: <STRING or missing> // either `'entry'` to show it's an entrypoint to a bubble, `'exit'` to show it's an exit from a bubble or blank to show it is neither
  }
}
```

#### Handling completion

Handlers provide you with four different ways of showing completion: Promises, callbacks, a synchronous call or a straight value. To decide what the handler should treat as a successful result, remit follows the following pattern:

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

#### Middleware

You can provide multiple handlers in a sequence to act as middleware, similar to that of Express's. Every handler in the line is passed the same `event` object, so to pass data between the handlers, mutate that.

A common use case for middleware is validation. Here, a middleware handler adds a property to incoming data before continuing:

``` js
const endpoint = await remit
  .endpoint('foo.bar')
  .handler((event) => {
    event.foo = 'bar'
  }, (event) => {
    console.log(event)
    // event will contain `foo: 'bar'`

    return true
  })
  .start()
```

When using middleware, it's important to know how to break the chain if you need to. If anything other than `undefined` is returned in any handler (middleware or otherwise via a Promise/callback/sync call), the chain will break and that data will be returned to the requester.

If an exception is thrown at any point, the chain will also break and the error will be returned to the requester.

This means you can fall out of chains early. Let's say we want to fake an empty response for user #21:

``` js
const endpoint = await remit
  .endpoint('foo.bar')
  .handler((event) => {
    if (event.data.userId === 21) {
      return []
    }
  }, (event) => {
    return calculateUserList()
  })
  .start()
```

Or perhaps exit if a call is done with no authorisation token:

``` js
const endpoint = await remit
  .endpoint('foo.bar')
  .handler(async (event) => {
    if (!event.data.authToken) {
      throw new Error('No authorisation token given')
    }

    event.data.decodedToken = await decodeAuthToken(event.data.authToken)
  }, (event) => {
    return performGuardedCall()
  })
```

## Tracing

See [`remitrace`](https://github.com/jpwilliams/remitrace).


## License
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fjpwilliams%2Fremit.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fjpwilliams%2Fremit?ref=badge_large)
