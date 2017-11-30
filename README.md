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

  - [`request(name | RequestOpts [, Data ])`](requestname--requestopts-data)
    - [`request(name | RequestOpts, Data) (Promise)`](#requestname--requestopts-data-promise)
    - [`request(name | RequestOpts)(Data) (Promise)`](#requestname--requestoptsdata-promise)
    - [`request(name | RequestOpts).send(Data) (Promise)`](#requestname--requestoptssenddata-promise)
    - [`request.options(opts) (Remit)`](#requestoptionsopts-remit)
    - [`request.fallback(Data) (Remit)`](#requestfallbackdata-remit)
    - [`request.on(Event, Handler) (Remit)`](#requestonevent-handler-remit)
    - [`request.ready() (Promise)`](#requestready-promise)

  - [`emit(name | EmitOpts [, Data ])`](#emitname--emitopts--data-)
    - [`emit(name | EmitOpts, Data) (Promise)`](#emitname--emitopts-data-promise)
    - [`emit(name | EmitOpts)(Data) (Promise)`](#emitname--emitoptsdata-promise)
    - [`emit(name | EmitOpts).send(Data) (Promise)`](#emitname--emitoptssenddata-promise)
    - [`emit.options(EmitOpts) (Remit)`](#emitoptionsemitopts-remit)
    - [`emit.on(Event, Handler) (Remit)`](#emitonevent-handler-remit)
    - [`emit.ready() (Promise)`](#emitready-promise)
 
  - [`endpoint(name [, ...Handler])`](#endpointname--handler)
    - [`endpoint(name, ...Handler) (Remit)`](#endpointname-handler-remit)
    - [`endpoint(name).handler(...Handler) (Remit)`](#endpointnamehandlerhandler-remit)
    - [`endpoint.options(EndpointOpts) (Remit)`](#endpointoptionsendpointopts-remit)
    - [`endpoint.on(Event, Handler) (Remit)`](#endpointonevent-handler-remit)
    - [`endpoint.start() (Promise)`](#endpointstart-promise)

  - [`listener(name [, ...Handler ])`](#listenername--handler-)
    - [`listener(name, ...Handler) (Remit)`](#listenername-handler-remit)
    - [`listener(name).handler(...Handler) (Remit)`](#listenernamehandlerhandler-remit)
    - [`listener.options(ListenerOpts) (Remit)`](#listeneroptionslisteneropts-remit)
    - [`listener.on(Event, Handler) (Remit)`](#listeneronevent-handler-remit)
    - [`listener.start() (Promise)`](#listenerstart-promise)
---

# Types
## `RequestOpts`

```javascript
RequestOpts {
  event: string;
  queue: string;
  timeout? = 30000: number;
  priority? = 0: number;
}
```

## `EmitOpts`
```javascript
EmitOpts {
  event: string;
  schedule?: number;
  delay?: number;
  priority? = 0: number;
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
function handler (Event) { ... }
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

# `request(name | RequestOpts [, Data ])`

## `request(name | RequestOpts, Data) (Promise)`
```javascript
remit.request('add', [5, 5])
  .then(console.log)
  .catch(console.error)
```

## `request(name | RequestOpts)(Data) (Promise)`
```javascript
const add = remit.request('add')

add[5, 5])
  .then(console.log)
  .catch(console.error)
```

## `request(name | RequestOpts).send(Data) (Promise)`
```javascript
const add = remit.request('add')

add
  .send([5, 5])
  .then(console.log)
  .catch(console.error)
```

## `request.options(RequestOpts) (Remit)`
```javascript
const add = remit.request('add')

add
  .options({ timeout: 1000 })
  .send([5, 5])
  .then(console.log)
  .catch(console.error)
```
## `request.fallback(Data) (Remit)`
```javascript
const add = remit.request('add')

add
  .options({ timeout: 1000 })
  .fallback(10)
  .send([5, 5])
  .then(console.log)
  .catch(console.error)
```

## `request.on(Event, Handler) (Remit)`
```javascript
const add = remit.request('add')

add.on('data', console.log) // will log twice (10 and 5)

add([5, 5])
add([5])
```

# `emit(name | EmitOpts [, Data ])`

## `emit(name | EmitOpts, Data) (Promise)`
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

## `emit(name | EmitOpts)(Data) (Promise)`
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

## `emit(name | EmitOpts).send(Data) (Promise)`
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

## `emit.options(EmitOpts) (Remit)`
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

## `emit.on(Event, Handler) (Remit)`
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

## `emit.ready() (Promise)`
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

# `endpoint(name [, ...Handler])`

## `endpoint(name, ...Handler) (Remit)`

## `endpoint(name).handler(...Handler) (Remit)`

## `endpoint.options(EndpointOpts) (Remit)`

## `endpoint.on(Event, Handler) (Remit)`

## `endpoint.start() (Promise)`


# `listener(name [, ...Handler ])`

## `listener(name, ...Handler) (Remit)`

## `listener(name).handler(...Handler) (Remit)`

## `listener.options(ListenerOpts) (Remit)`

## `listener.on(Event, Handler) (Remit)`

## `listener.start() (Promise)`