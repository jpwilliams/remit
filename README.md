# remit

[![Build Status](https://travis-ci.org/jpwilliams/remit.svg?branch=master)](https://travis-ci.org/jpwilliams/remit) [![Coverage Status](https://coveralls.io/repos/github/jpwilliams/remit/badge.svg?branch=master)](https://coveralls.io/github/jpwilliams/remit?branch=v2) [![npm downloads per month](https://img.shields.io/npm/dm/remit.svg)](https://www.npmjs.com/package/remit) [![npm version](https://img.shields.io/npm/v/remit.svg)](https://www.npmjs.com/package/remit)

## What is remit?

*A node.js service mesh for building event-driven microservices with batteries included.*

It is built atop [RabbitMQ](http://www.rabbitmq.com) as an [ESB](https://en.wikipedia.org/wiki/Enterprise_service_bus)

### Why remit?
- Service discovery is included
- Request/Response (asynchronous) for RPC
- PubSub (aka send-and-forget) for durable tasks

---

## Getting started
``` sh
brew install rabbitmq
npm install remit
```

---

## API

- `Remit`
  - [`request(name | RequestOpts [, data ])`](#request)
    - [`request(name | RequestOpts, data) (Promise)`](#request_curry)
    - [`request(name | RequestOpts)(data) (Promise)`](#request_curry)
    - [`request(name | RequestOpts).send(data) (Promise)`](#request_send)
    - [`request.options(opts) (Remit)`](#request_options)
    - [`request.fallback(data) (Remit)`](#request_fallback)
    - [`request.on(event, fn) (Remit)`]()

  - [`emit(name | EmitOpts [, data ])`](#emit)
    - [`emit(name | EmitOpts, data) (Promise)`](#emit_invoke)
    - [`emit(name | EmitOpts)(data) (Promise)`](#emit_curry)
    - [`emit(name | EmitOpts).send(data) (Promise)`](#emit_send)
    - [`emit.options(EmitOpts) (Remit)`](#emit_options)
    - [`emit.on(event, fn) (Remit)`]()

  - [`endpoint(name [, ...fn])`](#endpoint)
    - [`endpoint(name, ...fn) (Remit)`](#endpoint_invoke)
    - [`endpoint(name).handler(...fn) (Remit)`](#endpoint_handle)
    - [`endpoint.options(opts) (Remit)`](#endpoint_options)
    - [`endpoint.on(event, fn) (Remit)`]()
    - [`endpoint.start() (Promise)`](#endpoint_start)

  - [`listener(name [, ...fn ])`](#listener)
    - [`listener(name, ...fn) (Remit)`](#listener_invoke)
    - [`listener(name).handler(...fn) (Remit)`](#listener_invoke)
    - [`listener.options(opts) (Remit)`](#listener_options)
    - [`listener.on(event, fn) (Remit)`]()
    - [`listener.start() (Promise)`](#listener_start)
---
