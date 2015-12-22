# What's Remit?
A small set of functionality used to create microservices that don't need to be aware of one-another's existence. It uses AMQP at its core to manage service discovery-like behaviour without the need to explicitly connect one service to another.

# Contents

* [Simple usage](#simple-usage)
* [Pre-requisites](#pre-requisites)
* [Installation](#installation)
* [Key examples](#key-examples)
* [API reference](#api-reference)
* [Improvements](#improvements)

# Simple usage

`remit` makes use of four simple commands: `req` (request), `res` (respond), `emit` and `listen`.

* `req` requests data from a defined endpoint which, in turn, is created using `res`
* `listen` waits for messages `emit`ted from anywhere in the system.

A connection to your AMQP server's required before you can get going, but you can easily do that!

```javascript
const remit = require('remit')({
	name: 'my_service', // this is required for a service that has a listener
	url: 'amqp://localhost'
})
```

After that, the world is yours! Here are some basic examples of the four commands mentioned above.

```javascript
// API
remit.req('add', {
	first: 2,
	second: 7
}, function (err, data) {
	console.log('The result is ' + data)
})

// Server
remit.res('add', function (args, done) {
	done(null, (args.first + args.second))

	remit.emit('something.happened', args)
})

// Listener 1
remit.listen('something.happened', function (args, done) {
	console.log(args)

	// We return done() to acknowledge that the task has been completed
	return done()
})

// Listener 2
remit.listen('something.#', function (args) {
	console.log('Something... did something...')

	return done()
})

/*
	1. The API requests the 'add' endpoint.
	2. The Server responds with the result of the sum.
	3. The API logs 'The result is 9'.
	4. The Server emits the 'something.happened' event.
	5. Listener 1 logs the arguments the API sent.
	6. Listener 2 logs 'Something... did something...'.
*/
```

# Pre-requisites

To use `remit` you'll need:
* A _RabbitMQ_ server
* _Node v4.x.x_
* _npm_

# Installation

Once your _RabbitMQ_ server's up and running, simply use `npm` to install `remit`!
```javascript
npm install remit
```

# Key examples

There are two methods for sending messages with `remit`: _request_ or _emit_.

A _request_ implies that the requester wants a response back, whereas using an _emission_ means you wish to notify other services of an event without requiring their input.

Let's start with a simple authentication example. We'll set up an API that our user can request to log in.

```javascript
// Import remit and connect to our AMQP server
const remit = require('remit')()

// Import whatever HTTP API creator we want
const api = require('some-api-maker')

// Set up a route using our API creator
api.get('/login', function (req, res) {
	// Send a request via remit to the 'user.login' endpoint
	remit.req('user.login', {
		username: req.username,
		password: req.password
	}, function (err, data) {
		//If there's something wrong...
		if (err) return res.failure(err)

		// Otherwise, woohoo! We're logged in!
		return res.success(data.user)
	})
})
```

Awesome! Now we'll set up the authentication service that'll respond to the request.

```javascript
// Import remit and connect to our AMQP server
const remit = require('remit')()

// Respond to 'user.login' events
remit.res('user.login', function (args, done) {
	// If it's not Mr. Bean, send back an error!
	if (args.username !== 'Mr. Bean') return done('You\'re not Mr. Bean!')

	// Otherwise, let's "log in"
	done(null, {
		username: 'Mr. Bean',
		birthday: '14/06/1961'
	})
})
```

Done. That's it. Our `API` service will request an answer to the `user.login` endpoint and our server will respond. Simples.

Let's now say that we want a service to listen out for if it's a user's birthday and send them an email if they've logged in on that day! With most other systems, this would require adding business logic to our login service to explicitly call some `birthday` service and check, but not with `remit`.

At the end of our `authentication` service, let's add an emission of `user.login.success`.

```javascript
// Respond to 'user.login' events
remit.res('user.login', function (args, done) {
	// If it's not Mr. Bean, send back an error!
	if (args.username !== 'Mr. Bean') return done('You\'re not Mr. Bean!')

	// Otherwise, let's "log in"
	let user = {
		username: 'Mr. Bean',
		birthday: '14/06/1961'
	}

	done(null, user)

	// After we've logged the user in, let's emit that everything went well!
	remit.emit('user.login.success', { user })
})
```

Now that we've done that, _any_ other services on the network can listen in on that event and react accordingly!

Let's make our `birthday` service.

```javascript
const remit = require('remit')({
	name: 'birthday'	
})

const beanmail = require('send-mail-to-mr-bean')

remit.listen('user.login.success', function (args, done) {
	let today = '14/06/1961'

	if (today === args.user.birthday) {
		beanmail.send()
	}

	return done()
})
```

Sorted. Now every time someone logs in successfully, we run a check to see if it's their birthday.

Emissions can be hooked into by any number of different services, but only one "worker" per service will receive each emission.

So let's also start logging every time a user performs _any_ action. We can do this by using the `#` wildcard.

```javascript
const remit = require('remit')({
	name: 'logger'
})

let user_action_counter = 0

remit.listen('user.#', function (args, done) {
	user_action_counter++

	return done()
})
```

# API reference

* [`Remit`](#requireremitoptions) - Instantiate Remit
* [`req`](#reqendpoint-data-callback-options--timeout-5000) - Make a request to an endpoint
* [`treq`](#treqendpoint-data-callback-options--timeout-5000) - Make a transient request to an endpoint
* [`res`](#resendpoint-callback-context-options--queuename-my_queue) - Define an endpoint
* [`emit`](#emitevent-data-options) - Emit to all listeners of an event
* [`demit`](#demitevent-eta-data-options) - Emit to all listeners of an event at a specified time
* [`listen`](#listenevent-callback-context-options--queuename-my_queue) - Listen to emissions of an event

## require('remit')([options])

Creates a Remit object, with the specified `options` (if any), ready for use with further functions.

#### Arguments

* `options` - _Optional_ An object containing options to give to the Remit instantiation. Currently-acceptable options are:
	* `name` - The name to give the current service. This is used heavily for load balancing requests, so instances of the same service (that should load balance requests between themselves) should have the same name. Is _required_ if using [`listen`](#listenevent-callback-context-options--queuename-my_queue).
	* `url` - The URL to use to connect to the AMQ. Defaults to `amqp://localhost`.
	* `connection` - If you already have a valid AMQ connection, you can provide and use it here. The use cases for this are slim but present.

## req(endpoint, data, [callback], [options = {timeout: 5000}])

Makes a request to the specified `endpoint` with `data`, optionally returning a `callback` detailing the response. It's also possible to provide `options`, namely a `timeout`.

#### Arguments

* `endpoint` - A string endpoint that can be defined using [`res`](#resendpoint-callback-context-options--queuename-my_queue).
* `data` - Can be any of `boolean`, `string`, `array` or `object` and will be passed to the responder.
* `callback(err, data)` - _Optional_ A callback which is called either when the responder has handled the message or the message "timed out" waiting for a response. In the case of a timeout, `err` will be populated, though the responder can also explicitly control what is sent back in both `err` and `data`.
* `options` - _Optional_ Supply an object here to explicitly define certain options for the AMQ message. `timeout` is the amount of time in milliseconds to wait for a response before returning an error. There is currently only one _defined_ use case for this, though it gives you total freedom as to what options you provide.

#### Examples

```javascript
// Calls the 'user.profile', endpoint, but doesn't ask for a response.
remit.req('user.profile', {
	username: 'jacob123'
})
```

```javascript
// Calls the 'user.profile' endpoint asking for a response but timing out after the default of 5 seconds.
remit.req('user.profile', {
	username: 'jacob123'
}, (err, data) => {
	if (err) console.error('Oh no! Something went wrong!', err)

	return console.log('Got the result back!', data)
})
```

```javascript
// Calls the 'user.profile', endpoint asking for a response but timing out after a custom wait of 20 seconds.
remit.req('user.profile', {
	username: 'jacob123'
}, (err, data) => {
	if (err) console.error('Oh no! Something went wrong!', err)

	return console.log('Got the result back!', data)
}, {
	timeout: 20000
})
```

#### AMQ behaviour

1. Confirms connection and exchange exists.
2. If a callback's provided, confirm the existence of and consume from a "result queue" specific to this process.
3. Publish the message using the provided `endpoint` as a routing key.

## treq(endpoint, data, [callback], [options = {timeout: 5000}])

Identical to [`req`](#reqendpoint-data-callback-options--timeout-5000) but will remove the request message upon timing out. Useful for calls from APIs. For example, if a client makes a request to delete a piece of content but that request times out, it'd be jarring to have that action suddenly undertaken at an unspecified interval afterwards. `treq` is useful for avoiding that circumstance.

#### AMQ behaviour

Like [`req`](#reqendpoint-data-callback-options--timeout-5000) but adds an `expiration` field to the message.

## res(endpoint, callback, [context], [options = {queueName: 'my_queue'}])

Defines an endpoint that responds to [`req`](#reqendpoint-data-callback-options--timeout-5000)s. Returning the provided `callback` is a nessecity regardless of whether the requester wants a response as it is to used to acknowledge messages as being handled.

#### Arguments

* `endpoint` - A string endpoint that requetsers will use to reach this function.
* `callback(args, done)` - A callback containing data from the requester in `args` and requiring the running of `done(err, data)` to signify completion regardless of the requester's requirement for a response.
* `context` - _Optional_ The context in which `callback(args, done)` will be called.
* `options` - _Optional_ An object that can contain a custom queue to listen for messages on.

#### Examples

```javascript
// Defines the 'user.profile' profile endpoint, retrieving a user from our dummy database
remit.res('user.profile', function (args, done) {
	if (args.username) return done('No username provided!')

	mydb.get_user(args.username, function (err, user) {
    	return done(err, user)
    })
})
```

#### AMQ behaviour

1. Confirms connection and exchange exists.
2. Binds to and consumes from the queue with the name defined by `endpoint`

## emit(event, [data], [options])

Emits to all [`listen`](#listenevent-callback-context-options--queuename-my_queue)ers of the specified event, optionally with some `data`. This is essentially the same as [`req`](#reqendpoint-data-callback-options--timeout-5000) but no `callback` can be defined and `broadcast` is set to `true` in the message options.

#### Arguments

* `event` - The "event" to emit to [`listen`](#listenevent-callback-context-options--queuename-my_queue)ers.
* `data` - _Optional_ Data to send to [`listen`](#listenevent-callback-context-options--queuename-my_queue)ers. Can be any of `boolean`, `string`, `array` or `object`.
* `options` - _Optional_ Like [`req`](#reqendpoint-data-callback-options--timeout-5000), supply an object here to explicitly define certain options for the AMQ message.

#### Examples

```javascript
// Emits the 'user.registered' event to all listeners
remit.emit('user.registered')
```

```javascript
// Emits the 'user.registered' event, supplying some of the user's basic information
remit.emit('user.registered', {
	username: 'jacob123',
    name: 'Jacob Four',
    email: 'jacob@five.com',
    website: 'www.six.com'
})
```

#### AMQ behaviour

1. Confirms connection and exchange exists.
2. Publish the message using the provided `endpoint` as a routing key and with the `broadcast` option set to `true`.

## demit(event, eta, [data], [options])

Like [`emit`](#emitevent-data-options) but tells [`listen`](#listenevent-callback-context-options--queuename-my_queue)ers to wait until `eta` to running their respective functions. Similar in design and functionality to [Celery's `eta` usage](http://docs.celeryproject.org/en/latest/userguide/calling.html#eta-and-countdown). Largely useful for tasks that should repeat like session health checks.

#### Arguments

* `event` - The "event" to emit to [`listen`](#listenevent-callback-context-options--queuename-my_queue)ers.
* `eta` - A `date` object being the earliest time you wish listeners to respond to the emission.
* `data` - _Optional_ Data to send to [`listen`](#listenevent-callback-context-options--queuename-my_queue)ers. Can be any of `boolean`, `string`, `array` or `object`.
* `options` - _Optional_ Like [`req`](#reqendpoint-data-callback-options--timeout-5000), supply an object here to explicitly define certain options for the AMQ message.

#### Examples

```javascript
// Emits a "health.check" event that should be processed in 24 hours
let tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)

remit.demit('health.check', tomorrow)
```

```javascript
// Emits a "health.check" event that should be processed in 24 hours, providing some relevant data
let tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)

remit.demit('health.check', tomorrow, {
	current_health: 52
})
```

#### AMQ behaviour

Like [`emit`](#emitevent-data-options) but adds a `timestamp` field to the message which is understood by [`listen`](#listenevent-callback-context-options--queuename-my_queue)-based functions.

## listen(event, callback, [context], [options = {queueName: 'my_queue'}])

Listens to events emitted using [`emit`](#emitevent-data-options). Listeners are grouped for load balancing using their `name` provided when instantiating Remit.

While listeners can't sent data back to the [`emit`](#emitevent-data-options)ter, calling the `callback` is still required for confirming successful message delivery.

#### Arguments

* `event` - The "event" to listen for emissions of.
* `callback(args, done)` - A callback containing data from the emitter in `args` and requiring the running of `done(err)` to signify completion.
* `context` - _Optional_ The context in which `callback(args, done)` will be called.
* `options` - _Optional_ An object that can contain a custom queue to listen for messages on.

#### Examples

```javascript
// Listens for the "user.registered" event, logging the outputted data
remit.listen('user.registered', function (args, done) {
	console.log('User registered!', args)
    
    return done()
})
```

#### AMQ behaviour

1. Confirms connection and exchange exists.
2. Sets a service-unique queue name and confirms it exists
3. Binds the queue to the routing key defined by `event` and starts consuming from said queue

# Improvements

`remit`'s in its very early stages. Basic use is working well, but here are some features I'm looking at implementing to make things a bit more diverse.

* Ability to specify exchange per connection, endpoint or event
* Cleaner error handling (along with some standards)
* ~~Removal of all use of `process.exit()`~~
* Connection retrying when losing connection to the AMQ
* Use promises instead of callbacks
* Warnings for duplicate `req` subscriptions
* ~~Better handling of `req` timeouts~~
* Ability for emissions to receive (multiple) results from listeners if required (I really want to use generators for this)
* Obey the `JSON-RPC 2.0` spec
* Tests!