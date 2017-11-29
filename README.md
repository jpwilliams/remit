# Remit

[![Build Status](https://travis-ci.org/jpwilliams/remit.svg?branch=master)](https://travis-ci.org/jpwilliams/remit) [![Coverage Status](https://coveralls.io/repos/github/jpwilliams/remit/badge.svg?branch=master)](https://coveralls.io/github/jpwilliams/remit?branch=v2) [![npm downloads per month](https://img.shields.io/npm/dm/remit.svg)](https://www.npmjs.com/package/remit) [![npm version](https://img.shields.io/npm/v/remit.svg)](https://www.npmjs.com/package/remit)

## What is Remit?

*A node.js service mesh for building event-driven microservices with batteries included.*

It is built atop [RabbitMQ](http://www.rabbitmq.com) as an [ESB](https://en.wikipedia.org/wiki/Enterprise_service_bus)

### Why Remit?
- [x] Service discovery
- [x] Request/Response RPC
- [x] PubSub (aka send-and-forget) messaging
- [ ] Tracing (_not yet_)

---

## Getting started
``` sh
brew install rabbitmq
npm install remit
```

---

## API

- `Remit`
  - [`Types`](#)
    - [`RequestOpts`](#)
    - [`EmitOpts`](#)
    - [`Handler`](#)
    - [`Event`](#)
    - [`Data`](#)

  - [`request(name | RequestOpts [, data ])`](#)
    - [`request(name | RequestOpts, data) (Promise)`](#)
    - [`request(name | RequestOpts)(data) (Promise)`](#)
    - [`request(name | RequestOpts).send(data) (Promise)`](#)
    - [`request.options(opts) (Remit)`](#)
    - [`request.fallback(data) (Remit)`](#)
    - [`request.on(event, Handler) (Remit)`](#)
    - [`endpoint.ready() (Promise)`](#)

  - [`emit(name | EmitOpts [, data ])`](#)
    - [`emit(name | EmitOpts, data) (Promise)`](#)
    - [`emit(name | EmitOpts)(data) (Promise)`](#)
    - [`emit(name | EmitOpts).send(data) (Promise)`](#)
    - [`emit.options(EmitOpts) (Remit)`](#)
    - [`emit.ready() (Promise)`](#)
    - [`emit.on(event, Handler) (Remit)`](#)

  - [`endpoint(name [, ...Handler])`](#)
    - [`endpoint(name, ...Handler) (Remit)`](#)
    - [`endpoint(name).handler(...Handler) (Remit)`](#)
    - [`endpoint.options(opts) (Remit)`](#)
    - [`endpoint.on(event, Handler) (Remit)`](#)
    - [`endpoint.start() (Promise)`](#)

  - [`listener(name [, ...Handler ])`](#)
    - [`listener(name, ...Handler) (Remit)`](#)
    - [`listener(name).handler(...Handler) (Remit)`](#)
    - [`listener.options(opts) (Remit)`](#)
    - [`listener.on(event, Handler) (Remit)`](#)
    - [`listener.start() (Promise)`](#)
---
