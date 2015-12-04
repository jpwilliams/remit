# What's Remit?
`remit` is intended to be a small set of functionality used to create simple microservices that don't need to be aware of one-another's existence.

It uses _RabbitMQ_ at its core to manage service discovery-like behaviour without the need to explicitly connect one service to another.

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
remit.listen('something.happened', function (args) {
	console.log(args)
})

// Listener 2
remit.listen('something.#', function (args) {
	console.log('Something... did something...')
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

remit.listen('user.login.success', function (args) {
	let today = '14/06/1961'

	if (today === args.user.birthday) {
		beanmail.send()
	}
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

remit.listen('user.#', function (args) {
	user_action_counter++
})
```

# Improvements

`remit`'s in its very early stages. Basic use is working well, but here are some features I'm looking at implementing to make things a bit more diverse.

* Ability to specify exchange per connection, endpoint or event
* Cleaner error handling (along with some standards)
* Removal of all use of `process.exit()`
* Connection retrying when losing connection to the AMQ
* Use promises instead of callbacks
* Warnings for duplicate `req` subscriptions
* Better handling of `req` timeouts
* Ability for emissions to receive (multiple) results from listeners if required (I really want to use generators for this)
* Obey the `JSON-RPC 2.0` spec
* Tests!