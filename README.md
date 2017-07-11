# _Remit_

[![Build Status](https://travis-ci.org/jpwilliams/remit.svg?branch=overhaul)](https://travis-ci.org/jpwilliams/remit) [![Coverage Status](https://coveralls.io/repos/github/jpwilliams/remit/badge.svg?branch=overhaul)](https://coveralls.io/github/jpwilliams/remit?branch=overhaul) [![npm downloads per month](https://img.shields.io/npm/dm/remit.svg)](https://www.npmjs.com/package/remit) [![npm version](https://img.shields.io/npm/v/remit.svg)](https://www.npmjs.com/package/remit) [![Jack Tuck](https://img.shields.io/badge/tuck-approved-brightgreen.svg)](https://github.com/jacktuck)

A small set of functionality used to create microservices that don't need to be aware of one-another's existence.

``` sh
npm install remit
```

``` js
const remit = require('remit')()

;(async function () {
  const endpoint = remit
    .endpoint('user.profile')
    .data((event, callback) => {
      const user = getUser({ id: event.data.id })

      callback(null, user)
    })

  await endpoint.ready()

  try {
    var user = await remit
      .request('user.profile')
      .send({ id: 123 })
  } catch (e) {
    console.error('Error getting user', e)
  }

  if (user) {
    console.log('Got user', user)
  }
})()
```

## Contents

* [Getting started](#)
* [Concepts](#concepts)
* [API reference](#api-reference)

## Concepts

##### Basic

_Remit_, primarily, makes use of four simple commands: `request`, `respond`, `emit` and `listen`.

`request` requests data from an endpoint defined using `respond`.
`emit` "emits" data to any and all "listeners" defined using `listen`.

##### Example

A simple example here allows us to define an endpoint that increments a counter and emits that change to the rest of the system.

``` js
// This service sets up our counter and incrementer.
const remit = require('remit')()
let counter = 0

remit
    .endpoint('counter.increment')
    .data((event, callback) => {
        remit.emit('counter.incremented').send(++counter)

        return callback(null, counter)
    })
```

``` js
// Here we set up a listener for when the counter's been incremented
const remit = require('remit')()

remit
    .listen('counter.incremented')
    .data((event, callback) => {
        console.log(`Counter is now ${event.data}`)

        return callback()
    })
```

``` js
// And here we increment the counter!
const remit = require('remit')()

remit.request('counter.increment')()
```

## API reference

* [Remit](#remit-1)
* [remit](#requireremitoptions--remit-)
* [Request](#requestdata-)
* [#request / #req](#remitrequestendpoint-options--request-)
* [#emit](#templates)
* [Response](#responsedata-)
* [#respond / #res / #endpoint](#remitrespondendpoint-options--response-)
* [#listen / #on](#templates-1)

------

#### `Remit`

A _Remit_ instance representing a single connection to the AMQ in use.

##### Properties

* [`request` (`req`)](#remitrequestendpoint-options--request-)
* [`emit`](#templates)
* [`respond` (`res`, `endpoint`)](#remitrespondendpoint-options--response-)
* [`listen` (`on`)](#templates-1)

------

#### `require('remit')([options])` > [`Remit`](#remit-1) [^](#api-reference)

Creates a new _Remit_ instance, using the given options, and connects to the message queue.

##### Arguments

* `options` (_Optional_) An object containing a mixture of _Remit_ and AMQ options. Acceptable values are currently:
  * `url` (_Optional, defaults to `'amqp://localhost'`_) The [RabbitMQ URI](https://www.rabbitmq.com/uri-spec.html) to use to connect to the AMQ instance. If not defined, tries to fall back to the `REMIT_URL` environment variable before the default. Any query string options defined are overwritten.
  * `name` (_Optional, defaults to `''`_) The friendly connection name to give the service. This is used heavily for load balancing requests, so instances of the same service (that should load balance requests between themselves) should have the same name. If not defined, tries to fall back to the `REMIT_NAME` environment variable before the default.
  * `exchange` (_Optional, defaults to `'remit'`_) The AMQ exchange to connect to.

##### Returns [`Remit`](#remit-1)

##### AMQ behaviour

1. Connects to the AMQ

------

#### `Request([data])` [^](#api-reference)

A request set up for a specific endpoint, ready to send and receive data.

##### Arguments

* `data` (_Optional_) Can be any JSON-compatible data that you wish to send to the endpoint.

##### Properties

* `send` Synonymous with calling the `Request` object.
* `data(callback)` Provide a callback to be run when a reply is received from a request.
* `sent(callback)` Provide a callback to be run when the request successfully sends data to an endpoint.

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

##### Properties

* `data(callback)` Provide a global callback to be run when a reply is received from _any_ request.
* `sent(callback)` Provide a global callback to be run when _any_ request successfully sends data to an endpoint.

##### Returns [`Request`](#requestdata-)

##### AMQ behaviour

1. If a reply is sought, follow sub-steps, otherwise skip to step #2
  1. Ensure a connection is available
  2. Ensure the channel used for publishing is available
  3. Start consuming from `amq.rabbitmq.reply-to`
2. Ensure a connection is available
3. Ensure the channel used for publishing is available
4. Publish the message

------

#### `Response` [^](#api-reference)

An active endpoint set up and ready to receive data.

##### Properties

* `data` Provide a callback to be run when a request is received.
* `ready` Provide a callback to be run when the endpoint becomes live and ready.

------

#### `remit.respond(endpoint[, options])` > [`Response`](#responsedata-) [^](#api-reference)

_Aliases: `res`, `endpoint`_

##### Arguments

* `endpoint` A string representing the name of the endpoint. This is used as a routing key (see the [RabbitMQ Topics Tutorial](https://www.rabbitmq.com/tutorials/tutorial-five-javascript.html)) so the only allowed characters are `a-zA-Z0-9_.-`.
* `options` (_Optional_) An object containing a mixture of _Remit_ and AMQ options. Acceptable values are currently:
  * `something`

##### Properties

* `data` Provide a global callback to be run when _any_ request is received.
* `ready` Provide a global callback to be run when _any_ endpoint becomes live and ready.

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

##### AMQ behaviour

1. Ensure a connection is available
2. Ensure the channel used for miscellaneous work is available
3. Assert the presence of the queue named after the event given
4. Ensure the channel used for consuming is available
5. Bind the asserted queue using a duplicate routing key
6. Ensure the channel used for consuming is available
7. Start consuming from the event
