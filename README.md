# Remit

[![Build Status](https://travis-ci.org/jpwilliams/remit.svg?branch=master)](https://travis-ci.org/jpwilliams/remit) [![Coverage Status](https://coveralls.io/repos/github/jpwilliams/remit/badge.svg?branch=master)](https://coveralls.io/github/jpwilliams/remit?branch=v2) [![npm downloads per month](https://img.shields.io/npm/dm/remit.svg)](https://www.npmjs.com/package/remit) [![npm version](https://img.shields.io/npm/v/remit.svg)](https://www.npmjs.com/package/remit)

# What is Remit?

*A node.js service mesh for building event-driven microservices with batteries included.*

It is built atop [RabbitMQ](http://www.rabbitmq.com) as an [ESB](https://en.wikipedia.org/wiki/Enterprise_service_bus)

# Why Remit?
- [x] Service discovery
- [x] Request/Response RPC
- [x] PubSub (aka send-and-forget) messaging
- [ ] Tracing (_not yet_)

---

# Getting started
```sh
brew install rabbitmq
npm install remit
```

---

# API

- [`Remit`](#)
  - [`Types`](#types)
    - [`RequestOpts`](#requestopts)
    - [`EmitOpts`](#emitopts)
    - [`EndpointOpts`](#endpointopts)
    - [`ListenerOpts`](#listeneropts)   
    - [`Handler`](#handler)
    - [`Event`](##event)
    - [`Data`](#data)
    - [`EventTarget`](#eventtarget)

  - [`API`](#api)
    - [`request(name | RequestOpts [, Data ])`](requestname--requestopts-data)
      - [`request(name | RequestOpts, Data) (Promise)`](#requestname--requestopts-data-promise)
      - [`request(name | RequestOpts)(Data) (Promise)`](#requestname--requestoptsdata-promise)
      - [`request(name | RequestOpts).send(Data) (Promise)`](#requestname--requestoptssenddata-promise)
      - [`request.options(opts) (Remit)`](#requestoptionsopts-remit)
      - [`request.fallback(Data) (Remit)`](#requestfallbackdata-remit)
      - [`request.on(EventTarget, Handler) (Remit)`](#requestonevent-handler-remit)
      - [`request.ready() (Promise)`](#requestready-promise)

    - [`emit(name | EmitOpts [, Data ])`](#emitname--emitopts--data-)
      - [`emit(name | EmitOpts, Data) (Promise)`](#emitname--emitopts-data-promise)
      - [`emit(name | EmitOpts)(Data) (Promise)`](#emitname--emitoptsdata-promise)
      - [`emit(name | EmitOpts).send(Data) (Promise)`](#emitname--emitoptssenddata-promise)
      - [`emit.options(EmitOpts) (Remit)`](#emitoptionsemitopts-remit)
      - [`emit.on(EventTarget, Handler) (Remit)`](#emitonevent-handler-remit)
      - [`emit.ready() (Promise)`](#emitready-promise)
  
    - [`endpoint(name [, ...Handler])`](#endpointname--handler)
      - [`endpoint(name, ...Handler) (Remit)`](#endpointname-handler-remit)
      - [`endpoint(name).handler(...Handler) (Remit)`](#endpointnamehandlerhandler-remit)
      - [`endpoint.options(EndpointOpts) (Remit)`](#endpointoptionsendpointopts-remit)
      - [`endpoint.on(EventTarget, Handler) (Remit)`](#endpointonevent-handler-remit)
      - [`endpoint.start() (Promise)`](#endpointstart-promise)

    - [`listener(name [, ...Handler ])`](#listenername--handler-)
      - [`listener(name, ...Handler) (Remit)`](#listenername-handler-remit)
      - [`listener(name).handler(...Handler) (Remit)`](#listenernamehandlerhandler-remit)
      - [`listener.options(ListenerOpts) (Remit)`](#listeneroptionslisteneropts-remit)
      - [`listener.on(EventTarget, Handler) (Remit)`](#listeneronevent-handler-remit)
      - [`listener.start() (Promise)`](#listenerstart-promise)
---

# Types
## `RequestOpts`

```javascript
RequestOpts {
  event: string;
  queue: string;
  timeout=3000?: number;
  priority=0?: number;
}
```

## `EmitOpts`
```javascript
EmitOpts {
  event: string;
  schedule?: number;
  delay?: number;
  priority=0?: number;
}
```

## `EndpointOpts`
```javascript
EndpointOpts {
  event: string;
  queue: string;
}

```
## `ListenerOpts`
```javascript
ListenerOpts {
  event: string;
  queue: string;
}
```

## `Handler`
```javascript
function fn (Event) {} 

Handler fn | Data
```

## `Event`
```javascript
Event {
  started?: date;
  eventId?: string;
  scheduled? string;
  delay?: string;
  resourceTrace?: string;
  data?: Data
}
```

## `Data`
```javascript
Data array | arrayBuffer | buffer | string
```

## `EventTarget`
| Event | Description | Value | Request | Endpoint | Emit | Listen |
| ----- | ----------- | ------- |  :---:  |   :---:  | :---: | :---: |
| `data` | received data | Data | ✅ | ✅ | ❌ | ✅ |
| `sent` | dispatched event | Event | ✅ | ✅ | ✅ | ❌ |
| `error` | event failed | Error | ✅ | ✅ | ✅ | ✅ |
| `timeout` | event failed to yield within timeout SLA | Error | ✅ | ❌ | ❌ | ❌ |
| `success` | event successful yielded | Data | ✅ | ✅ | ✅ | ✅ |

# `API`
Examples will use the Promise. You can use the Promise or callback style; for example:
```javascript
  // If you want to 'resolve' and yield a value
  const resolveWithPromise = async event => event.data.reduced((a, b) => a + b, 0)
  const resolveWithCallback = (event, done) => done(null, event.data.reduced((a, b) => a + b, 0))

  // If you want to 'reject' and yield a error
  const rejectWithPromise = async event => throw new Error('whoops')
  const rejectWithCallback = (event, done) => done(new Error('whoops'))

  Any of the above would work as an Handler
```

## `request(name | RequestOpts [, Data ])`

### `request(name | RequestOpts, Data) (Promise)`
```javascript
remit.request('add', [5, 5])
  .then(console.log)
  .catch(console.error)
```

### `request(name | RequestOpts)(Data) (Promise)`
```javascript
const add = remit.request('add')

add[5, 5])
  .then(console.log)
  .catch(console.error)
```

### `request(name | RequestOpts).send(Data) (Promise)`
```javascript
const add = remit.request('add')

add
  .send([5, 5])
  .then(console.log)
  .catch(console.error)
```

### `request.options(RequestOpts) (Remit)`
```javascript
const add = remit.request('add')

add
  .options({ timeout: 1000 })
  .send([5, 5])
  .then(console.log)
  .catch(console.error)
```
### `request.fallback(Data) (Remit)`
```javascript
const add = remit.request('add')

add
  .options({ timeout: 1000 })
  .fallback(10)
  .send([5, 5])
  .then(console.log)
  .catch(console.error)
```

### `request.on(EventTarget, Handler) (Remit)`
```javascript
const add = remit.request('add')

add.on('data', console.log) // will log twice (10 and 5)

add([5, 5])
add([5])
```

## `emit(name | EmitOpts [, Data ])`

### `emit(name | EmitOpts, Data) (Promise)`
```javascript
;(async function () {
  const add = remit.request('add')
  const added = sum => remit.emit('added', sum)

  const sum = [5, 5]
  const result = await add(sum)

  await added({
    sum,
    result
  })
})()
```

### `emit(name | EmitOpts)(Data) (Promise)`
```javascript
;(async function () {
  const add = remit.request('add')
  const added = remit.emit('added')

  const sum = [5, 5]
  const result = await add(sum)

  await added({
    sum,
    result
  })
})()
```

### `emit(name | EmitOpts).send(Data) (Promise)`
```javascript
;(async function () {
  const add = remit.request('add')
  const added = remit.emit('added')

  const sum = [5, 5]
  const result = await add(sum)

  await added
    .send({
      sum,
      result
    })
})()
```

### `emit.options(EmitOpts) (Remit)`
```javascript
// Delay a message by 10 seconds

;(async function () {
  const add = remit.request('add')
  const added = remit.emit('added')

  const sum = [5, 5]
  const result = await add(sum)

  // With a delta in seconds
  await added
    .options({
      delay: 10000
    })
    .send({
      sum,
      result
    })

  // With a future date
  await added
    .options({
      schedule: Date.now() + 10000
    })
    .send({
      sum,
      result
    })
})()
```

### `emit.on(EventTarget, Handler) (Remit)`
```javascript
;(async function () {
  const add = remit.request('add')
  emit('added')

  const sum = [5, 5]
  const result = await add(sum)

  await added
    .on('data', console.log)
    .send({
      sum,
      result
    })
})()
```

### `emit.ready() (Promise)`
```javascript
;(async function () {
  const add = remit.request('add')
  const added = remit.emit('added')

  await add.ready()
  await added.ready()

  const sum = [5, 5]
  const result = await add(sum)

  await added
    .send({
      sum,
      result
    })
})()
```

## `endpoint(name [, ...Handler])`
You can provide multiple handlers in a sequence to act as middleware, similar to that of Express's. Every handler in the line is passed the same event object, so to pass data between the handlers, mutate that.

### `endpoint(name, ...Handler) (Remit)`
```javascript
;(async function () {
  remit
    .endpoint('add', parse, add)
    .start()

  async function parse (event) {
    if (!Array.isArray(event.data)) {
      throw 'needs an array of values to sum'
    }

    event.data = event.data.map(parseInt) // make sure we're adding ints by mutating event
    return event
  }

  async function add (event) {
   return event.data.reduce((a, b) => a + b, 0)
  }
})()
```
### `endpoint(name).handler(...Handler) (Remit)`
```javascript
;(async function () {

  const remit
    .endpoint('add')
    .handler(
      parse,
      add
    )
    .start()

  async function parse (event) {
    if (!Array.isArray(event.data)) {
      throw 'needs an array of values to sum'
    }

    event.data = event.data.map(parseInt) // make sure we're adding ints by mutating event
    return event
  }

  async function add (event) {
   return event.data.reduce((a, b) => a + b, 0)
  }
})()
```

### `endpoint.options(EndpointOpts) (Remit)`
```javascript
;(async function () {

  const remit
    .endpoint('add')
    .options({
      queue: 'custom-queue-name' // you probably don't want to specify the queue name yourself - but you could.
    })
    .handler(
      parse,
      add
    )
    .start()

  async function parse (event) {
    if (!Array.isArray(event.data)) {
      throw 'needs an array of values to sum'
    }

    event.data = event.data.map(parseInt) // make sure we're adding ints by mutating event
    return event
  }

  async function add (event) {
   return event.data.reduce((a, b) => a + b, 0)
  }
})()
```

### `endpoint.on(EventTarget, Handler) (Remit)`
```javascript
  const remit
    .endpoint('add')
    .on('data', console.log)
    .handler(
      parse,
      add
    )
    .start()

  async function parse (event) {
    if (!Array.isArray(event.data)) {
      throw 'needs an array of values to sum'
    }

    event.data = event.data.map(parseInt) // make sure we're adding ints by mutating event
    return event
  }

  async function add (event) {
   return event.data.reduce((a, b) => a + b, 0)
  }
})()
```

### `endpoint.start() (Promise)`
start() must be called on an endpoint before it will receive requests. An endpoint that's started without a handler (a function or series of functions that returns data to send back to a request) will throw. You can set handlers here or using endpoint.handler.

```javascript
  const remit
    .endpoint('add')
    .on('data', console.log)
    .handler(
      parse,
      add
    )
    .start()
    .then(() => console.log('endpoint has started'))

  async function parse (event) {
    if (!Array.isArray(event.data)) {
      throw 'needs an array of values to sum'
    }

    event.data = event.data.map(parseInt) // make sure we're adding ints by mutating event
    return event
  }

  async function add (event) {
   return event.data.reduce((a, b) => a + b, 0)
  }
})()
```

## `listener(name [, ...Handler])`
You can provide multiple handlers in a sequence to act as middleware, similar to that of Express's. Every handler in the line is passed the same event object, so to pass data between the handlers, mutate that.

### `listener(name, ...Handler) (Remit)`
```javascript
;(async function () {
  remit
    .listener('added', added)
    .start()

  async function added (event) {
    console.log('added', event.data)
  }
})()
```

### `listener(name).handler(...Handler) (Remit)`
```javascript
;(async function () {

  const remit
    .listener('added')
    .handler(added)
    .start()

  async function added (event) {
    console.log('added', event.data)
  }
})()
```

### `listener.options(listenerOpts) (Remit)`
```javascript
;(async function () {

  const remit
    .listener('added')
    .options({
      queue: 'custom-queue-name' // you probably don't want to specify the queue name yourself - but you could.
    })
    .handler(added)
    .start()

  async function added (event) {
    console.log('added', event.data)
  }
})()
```

### `listener.on(EventTarget, Handler) (Remit)`
```javascript
  const remit
    .listener('added')
    .on('data', console.log)
    .handler(added)

  async function added (event) {
    console.log('added', event.data)
  }
})()
```

### `listener.start() (Promise)`
start() must be called on an endpoint before it will receive requests. An endpoint that's started without a handler (a function or series of functions that returns data to send back to a request) will throw. You can set handlers here or using endpoint.handler.

```javascript
  const remit
    .listener('added')
    .on('data', console.log)
    .handler(added)

  async function added (event) {
    console.log('added', event.data)
  }
})()
```