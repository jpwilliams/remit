# remit

A wrapper for RabbitMQ for communication between microservices. No service discovery needed.

``` sh
npm install remit
```

``` js
remit
  .endpoint('user')
  .handler((event) => {
    return {
      name: 'Jack Williams',
      email: 'jack@wildfire.gg'
    }
  })

// another service/process
const user = await remit.request('user')()
console.log(user)

/* {
  name: 'Jack Williams',
  email: 'jack@wildfire.gg'
} */
```

---

## What's remit?

A simple wrapper over [RabbitMQ](http://www.rabbitmq.com) to provide [RPC](https://en.wikipedia.org/wiki/Remote_procedure_call) and [ESB](https://en.wikipedia.org/wiki/Enterprise_service_bus)-style behaviour.

It supports **request/response** calls (e.g. requesting a user's profile), **emitting events** to the entire system (e.g. telling any services interested that a user has been created) and basic **scheduling** of messages (e.g. recalculating something every 5 minutes), all **load balanced** sacross grouped services and redundant; if a service dies, another will pick up the slack.

There are four types you can use with Remit.

* [request](#), which fetches data from an [endpoint](#)
* [emit](#), which emits data to [listen](#)ers

Endpoints and listeners are grouped by "Service Name" specified as `name` or the environment variable `REMIT_NAME` when creating a Remit instance. This grouping means only a single consumer in that group will receive a message. This is used for scaling services.

---

## Contents

* [What's remit?](#)
* [Recommendations](#)
* [API/Usage](#)
* [Events](#)
* [Handlers](#)

---

## API/Usage

* [request(event)](#)
  * [request.on(eventName, listener)](#)
  * [request.fallback(data)](#)
  * [request.options(options)](#)
  * [request.ready()](#)
  * [request.send([data[, options]]) OR request([data[, options]])](#)
* [endpoint(event[, ...handlers])](#)
  * [endpoint.handler(...handlers)](#)
  * [endpoint.on(eventName, listener)](#)
  * [endpoint.options(options)](#)
  * [endpoint.start()](#)
* [emit(event)](#)
  * [emit.on(eventName, listener)](#)
  * [emit.options(options)](#)
  * [emit.ready()](#)
  * [emit.send([data[, options]]) OR emit([data[, options]])](#)
* [listen(event[, ...handlers])](#)
  * [listen.handler(...handlers)](#)
  * [listen.on(eventName, listener)](#)
  * [listen.options(options)](#)
  * [listen.start()](#)
  
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

You can change the fallback at any point in a request's life and unset it by explicitly passing `undefined`.

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
  .request('foo'.bar')
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

[Endpoints](#) and [listeners](#) use handlers to reply to or, uh, handle incoming messages. In both cases, these are functions that can be passed when creating the listener or added/changed real-time by using the `.handler()` method.

All handlers are passed two items: `event` and `callback`. If `callback` is mapped, you will need to call it to indicate success/failure (see [Handling completion](#) below). If you do not map a callback, you can reply synchronously or by returning a Promise.

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
  // the time the message was taken from the server
  started: <Date>,

  // a unique ID for the message
  // (useful for idempotency purposes)
  eventId: '01BQ5MRBJJ2AK9N23BW4S84WN1',

  // the eventName used to call this endpoint/listener
  // (useful when using wildcard listeners)
  eventType: 'foo.bar',

  // the name of the service that called/emitted this
  resource: 'service-user',

  // the data sent with the request
  data: {userId: 123},

  // the time the message was created
  timestamp: <Date>
}
```

#### Handling completion

Handlers provide you with three different ways of showing completion: Promises, callbacks or a synchronous call. To decide what the handler should treat as a successful result, remit follows the following pattern:

```
if handler does not map second (callback) property:
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
