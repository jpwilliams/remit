# Remit

[![Build Status](https://travis-ci.org/jpwilliams/remit.svg?branch=master)](https://travis-ci.org/jpwilliams/remit) [![Coverage Status](https://coveralls.io/repos/github/jpwilliams/remit/badge.svg?branch=master)](https://coveralls.io/github/jpwilliams/remit?branch=v2) [![npm downloads per month](https://img.shields.io/npm/dm/remit.svg)](https://www.npmjs.com/package/remit) [![npm version](https://img.shields.io/npm/v/remit.svg)](https://www.npmjs.com/package/remit)

## What is Remit?

*A node.js service mesh for building event-driven microservices with batteries included.*

It is built atop [RabbitMQ](http://www.rabbitmq.com) as an [ESB](https://en.wikipedia.org/wiki/Enterprise_service_bus)

### What is included?
- [x] Service discovery
- [x] Request/Response RPC
- [x] PubSub (_aka send-and-forget_) messaging
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
  - `Types`
    - [`RequestOpts`](#)
    - [`EmitOpts`](#)
    - [`Handler`](#)
    - [`Event`](#)
    - [`Data`](#)
  - [`request(name | RequestOpts [, data ])`](#request)
    - [`request(name | RequestOpts, data) (Promise)`](#request_curry)
    - [`request(name | RequestOpts)(data) (Promise)`](#request_curry)
    - [`request(name | RequestOpts).send(data) (Promise)`](#request_send)
    - [`request.options(opts) (Remit)`](#request_options)
    - [`request.fallback(data) (Remit)`](#request_fallback)
    - [`request.on(event, Handler) (Remit)`](#)
  - [`emit(name | EmitOpts [, data ])`](#emit)
    - [`emit(name | EmitOpts, data) (Promise)`](#emit_invoke)
    - [`emit(name | EmitOpts)(data) (Promise)`](#emit_curry)
    - [`emit(name | EmitOpts).send(data) (Promise)`](#emit_send)
    - [`emit.options(EmitOpts) (Remit)`](#emit_options)
    - [`emit.on(event, Handler) (Remit)`](#)
  - [`endpoint(name [, ...Handler])`](#endpoint)
    - [`endpoint(name, ...Handler) (Remit)`](#endpoint_invoke)
    - [`endpoint(name).handler(...Handler) (Remit)`](#endpoint_handle)
    - [`endpoint.options(opts) (Remit)`](#endpoint_options)
    - [`endpoint.on(event, Handler) (Remit)`](#)
    - [`endpoint.start() (Promise)`](#endpoint_start)

  - [`listener(name [, ...Handler ])`](#listener)
    - [`listener(name, ...Handler) (Remit)`](#listener_invoke)
    - [`listener(name).handler(...Handler) (Remit)`](#listener_invoke)
    - [`listener.options(opts) (Remit)`](#listener_options)
    - [`listener.on(event, Handler) (Remit)`](#)
    - [`listener.start() (Promise)`](#listener_start)
---
