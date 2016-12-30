# _Remit_

[![Build Status](https://travis-ci.org/jpwilliams/remit.svg?branch=overhaul)](https://travis-ci.org/jpwilliams/remit) [![Coverage Status](https://coveralls.io/repos/github/jpwilliams/remit/badge.svg?branch=overhaul)](https://coveralls.io/github/jpwilliams/remit?branch=overhaul) [![npm downloads per month](https://img.shields.io/npm/dm/remit.svg)](https://www.npmjs.com/package/remit) [![npm version](https://img.shields.io/npm/v/remit.svg)](https://www.npmjs.com/package/remit)

A small set of functionality used to create microservices that don't need to be aware of one-another's existence.

``` sh
npm install remit
```

``` js
// Create our Remit connection
const remit = require('remit')({
  url: 'localhost',
  name: 'a.micro.service'
})

// Set up an endpoint with the name 'micro.service.info'
remit
  .endpoint('micro.service.info')

  // When the endpoint is hit, run this function
  .data((data, callback) => {
    console.log('Endpoint was hit!')

    data.foo = 'bar'

    // Reply with the mutated data
    return callback(null, data)

  // Once the endpoint is ready...
  }).ready().then(() => {
    // Make a request to the 'micro.service.save' endpoint
    // with the data {name: 'a.micro.service'}
    return remit
      .request('micro.service.save')
      .send({name: 'a.micro.service'})
  }).then((result) => {
    // When the reply comes back, log the response.
    console.log('Saved microservice info', result)
  }).catch((err) => {
    // If the request failed (the replying microservice returned
    // an error, the request timed out or couldn't be routed),
    // log the error.
    console.error('Couldn\'t seem to save microservice info', err)
  })
```

## Contents

* [Getting started](#getting-started)
* [Concepts](#concepts)
* [API reference](#api-reference)

## API reference

* [Remit](#remit-1)
* [remit](#requireremitoptions--remit-)
* [Request](#requestdata-)
* [#request / #req](#remitrequestendpoint-options--request-)
* [#persistentRequest / #preq](#templates)
* [#emit](#templates)
* [#delayedEmit / #demit](#templates)
* [Response](#responsedata-)
* [#respond / #res / #endpoint](#remitrespondendpoint-options--response-)
* [#listen / #on](#templates-1)

------

#### `Remit`

A _Remit_ instance representing a single connection to the AMQ in use.

##### Properties

* [`request`](#remitrequestendpoint-options--request-)
* [`req`](#remitrequestendpoint-options--request-)
* [`persistentRequest`](#templates)
* [`preq`](#templates)
* [`emit`](#templates)
* [`delayedEmit`](#templates)
* [`demit`](#templates)
* [`respond`](#remitrespondendpoint-options--response-)
* [`res`](#remitrespondendpoint-options--response-)
* [`endpoint`](#remitrespondendpoint-options--response-)
* [`listen`](#templates-1)
* [`on`](#templates-1)

------

#### `require('remit')([options])` > [`Remit`](#remit-1) [^](#api-reference)

Creates a new _Remit_ instance, using the given options, and connects to the message queue.

##### Arguments

* `options` (_Optional_) An object containing a mixture of _Remit_ and AMQ options. Acceptable values are currently:
  * `url` (_Optional, defaults to `'amqp://localhost'`_) The [RabbitMQ URI](https://www.rabbitmq.com/uri-spec.html) to use to connect to the AMQ instance. If not defined, tries to fall back to the `REMIT_URL` environment variable before the default. Any query string options defined are overwritten.
  * `name` (_Optional, defaults to `''`_) The friendly connection name to give the service. This is used heavily for load balancing requests, so instances of the same service (that should load balance requests between themselves) should have the same name. If not defined, tries to fall back to the `REMIT_NAME` environment variable before the default.
  * `exchange` (_Optional, defaults to `'remit'`_) The AMQ exchange to connect to.

##### Returns [`Remit`](#remit-1)

##### Examples

Instantiates _Remit_ with default/environment-variable-defined options.

``` js
const remit = require('remit')()
```

Sets a name and [RabbitMQ URI](https://www.rabbitmq.com/uri-spec.html) to connect with. If the URI doesn't have a protocol specified, `'amqp://'` will be prepended for AMQP validity.

``` js
const remit = require('remit')({
  name: 'a.micro.service',
  url: 'amqp://rabbitmq:15555'
})
```

##### AMQ behaviour

1. Connects to the AMQ.

------

#### `Request([data])` [^](#api-reference)

A request set up for a specific endpoint, ready to send and receive data.

##### Arguments

* `data` (_Optional_) Can be any JSON-compatible data that you wish to send to the endpoint.

##### Properties

* `send` Synonymous with calling the `Request` object.
* `data(callback)` Provide a callback to be run when the endpoint receives a reply from a request.
* `sent(callback)` Provide a callback to be run when the endpoint successfully sends data to an endpoint.

##### Returns

Returns a promise that resolves when the reply is received. If `timeout` or `error` are emitted, the promise is rejected. If `data` is emitted with a falsey `err`, the promise is resolved. If the `err` is truthy, the promise is rejected.

------

#### `remit.request(endpoint[, options])` > [`Request`](#requestdata-) [^](#api-reference)

_Aliases: `req`_

Sets up a request pointed at the specified `endpoint` with the given `options`.

##### Arguments

* `endpoint` A string representing an endpoint, defined using [`respond` / `res` / `endpoint`](#remitrespondevent-options--response-).
* `options` (_Optional_) An object containing a mixture of _Remit_ and AMQ options. Acceptable values are currently:
  * `something`

##### Returns [`Request`](#requestdata-)


##### Templates

Some basic options templates are also set up as separate functions to allow for some semantically-pleasing set-ups without having to skim through objects to figure out what's happening.

``` js
// remit.persistentRequest
// remit.preq
{
  "some": "thing"
}

// remit.emit
{
  "some": "thing"
}

// remit.delayedEmit
// remit.demit
{
  "some": "thing"
}
```

##### Examples

##### AMQ behaviour

------

#### `Response([data])` [^](#api-reference)

------

#### `remit.respond(endpoint[, options])` > [`Response`](#responsedata-) [^](#api-reference)

_Aliases: `res`, `endpoint`_

##### Arguments

* `endpoint` A string representing the name of the endpoint. This is used as a routing key (see the [RabbitMQ Topics Tutorial](https://www.rabbitmq.com/tutorials/tutorial-five-javascript.html)) so the only allowed characters are `a-zA-Z0-9_.-`.
* `options` (_Optional_) An object containing a mixture of _Remit_ and AMQ options. Acceptable values are currently:
  * `something`

##### Returns [`Response`](#responsedata-)

##### Templates

Some basic options templates are also set up as separate functions to allow for some semantically-pleasing set-ups without having to skim through objects to figure out what's happening

``` js
// remit.listen
// remit.on
{
  "some": "thing"
}
```

##### Examples

##### AMQ behaviour
