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

  - [`request(name | RequestOpts [, Data ])`](#Request)
    - [`request(name | RequestOpts, Data) (Promise)`](#)
    - [`request(name | RequestOpts)(Data) (Promise)`](#)
    - [`request(name | RequestOpts).send(Data) (Promise)`](#)
    - [`request.options(opts) (Remit)`](#)
    - [`request.fallback(Data) (Remit)`](#)
    - [`request.on(Event, Handler) (Remit)`](#)
    - [`endpoint.ready() (Promise)`](#)

  - [`emit(name | EmitOpts [, Data ])`](#)
    - [`emit(name | EmitOpts, Data) (Promise)`](#)
    - [`emit(name | EmitOpts)(Data) (Promise)`](#)
    - [`emit(name | EmitOpts).send(Data) (Promise)`](#)
    - [`emit.options(EmitOpts) (Remit)`](#)
    - [`emit.on(Event, Handler) (Remit)`](#)
    - [`emit.ready() (Promise)`](#)
 
  - [`endpoint(name [, ...Handler])`](#)
    - [`endpoint(name, ...Handler) (Remit)`](#)
    - [`endpoint(name).handler(...Handler) (Remit)`](#)
    - [`endpoint.options(EndpointOpts) (Remit)`](#)
    - [`endpoint.on(Event, Handler) (Remit)`](#)
    - [`endpoint.start() (Promise)`](#)

  - [`listener(name [, ...Handler ])`](#)
    - [`listener(name, ...Handler) (Remit)`](#)
    - [`listener(name).handler(...Handler) (Remit)`](#)
    - [`listener.options(ListenerOpts) (Remit)`](#)
    - [`listener.on(Event, Handler) (Remit)`](#)
    - [`listener.start() (Promise)`](#)
---

# Types
## RequestOpts

```javascript
RequestOpts {
  event: string;
  queue: string;
  timeout? = 30000: number;
  priority? = 0: number;
}
```

## EmitOpts
```javascript
EmitOpts {
  event: string;
  schedule?: number;
  delay?: number;
  priority? = 0: number;
}
```

## EndpointOpts
```javascript
EndpointOpts {
  event: string;
  queue: string;
}

```
## ListenerOpts
```javascript
ListenerOpts {
  event: string;
  queue: string;
}
```

## Handler
```javascript
function handler (Event) { ... }
```

## Event
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

## Data
```javascript
Data array | arrayBuffer | buffer | string
```

## `request(name | RequestOpts [, Data ])`

## `request(name | RequestOpts, Data) (Promise)`

## `request(name | RequestOpts)(Data) (Promise)`

## `request(name | RequestOpts).send(Data) (Promise)`

## `request.options(opts) (Remit)`

## `request.fallback(Data) (Remit)`

## `request.on(Event, Handler) (Remit)`

## `endpoint.ready() (Promise)`

## `emit(name | EmitOpts [, Data ])`

## `emit(name | EmitOpts, Data) (Promise)`

## `emit(name | EmitOpts)(Data) (Promise)`

## `emit(name | EmitOpts).send(Data) (Promise)`

## `emit.options(EmitOpts) (Remit)`

## `emit.on(Event, Handler) (Remit)`

## `emit.ready() (Promise)`]
 
## `endpoint(name [, ...Handler])`

## `endpoint(name, ...Handler) (Remit)`

## `endpoint(name).handler(...Handler) (Remit)`

## `endpoint.options(EndpointOpts) (Remit)`

## `endpoint.on(Event, Handler) (Remit)`

## `endpoint.start() (Promise)`

## `listener(name [, ...Handler ])`

## `listener(name, ...Handler) (Remit)`

## `listener(name).handler(...Handler) (Remit)`

## `listener.options(ListenerOpts) (Remit)`

## `listener.on(Event, Handler) (Remit)`

## `listener.start() (Promise)`