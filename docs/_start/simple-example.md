---
layout: default
title:  "Simple example"
order: 2
---
# Simple example

A common interaction between services is a request and a response. We'll test that here by using a Remit `request` and `endpoint`.

{% highlight js %}
// endpoint.js
const remit = require('@jpwilliams/remit')()
const endpoint = remit
  .endpoint('hello')
  .handler(event => `Hello, ${event.data.name}!`)
  .start()

// request.js
const remit = require('@jpwilliams/remit')()
const sayHello = remit.request('hello')
sayHello({name: 'Jack'}).then(console.log)
{% endhighlight %}

Here, we create two files: an endpoint called `'hello'` which, when hit, returns `'Hello, NAME!'` and a requester which will hit the endpoint with some data and log the result.

Boom. Done.

If you'd like a more thorough explanation of the above, read on.

### Create a project

> We'll assume you have a local RabbitMQ running (following the [installation instructions]({{ site.baseurl }}{% link _start/installing.md %})).

First, let's create a new project and install Remit. In the terminal:

{% highlight bash %}
mkdir remit-example
cd remit-example
npm init -y
npm install @jpwilliams/remit --save
{% endhighlight %}


### Create an endpoint

Sorted. Now let's create a new file called `endpoint.js`:

{% highlight js %}
// endpoint.js
const Remit = require('@jpwilliams/remit') // import remit
const remit = Remit({ name: 'hello-service' }) // connect to remit as `hello-service`

// create a new endpoint
remit.endpoint('hello') // name it "hello"
	.handler('Hello, world!') // return "Hello, world!" when its hit
	.start() // start it!
	.then(() => console.log('Ready!')) // log when it's booted up
{% endhighlight %}

Super simple! We've got a file ready that boots an endpoint!

> When the endpoint boots, Remit will create a RabbitMQ "queue" for incoming messages. Requests will place a message in the endpoint's queue and provide an address of sorts to receive the reply on.

### Create a request

Let's now create another file called `request.js` which we'll use to send a request to our `'hello'` endpoint:

{% highlight js %}
// request.js
const Remit = require('@jpwilliams/remit') // import remit
const remit = Remit({ name: 'generic-api' }) // connect to remit as `generic-api`

const sayHello = remit.request('hello') // set up a request that hits the "hello" endpoint
sayHello().then(console.log) // send the request and log what comes back
{% endhighlight %}

When that file is run, it'll send a request to our `'hello'` endpoint.

> When the requester boots, Remit creates a temporary "reply" queue for incoming replies. Because of this small overhead, it's best to create a single request and re-use it multiple times.

Awesome. Let's give it a try.

### Run it!

{% highlight bash %}
# Terminal A
$ node endpoint.js
Ready!
{% endhighlight %}

Great. Our endpoint is booted! Now let's send a request!

{% highlight bash %}
# Terminal B
$ node request.js
Hello, world!
{% endhighlight %}

Woo! We made a request from one Node process, through Remit, to another Node process and back again! As long as these processes are connected to Remit, they can find eachother and communicate!

### Improvements

Right now, this returns a fixed piece of data, `'Hello, world!'`, but let's change that to instead use the data we've been sent and say hello to a particular person. We'll adjust our `endpoint.js` file to use a function for its handler instead.

{% highlight diff %}
remit.endpoint('hello')
-	.handler('Hello, world!')
+	.handler(event => `Hello, ${event.data.name}!`)
	.start()
	.then(() => console.log('Ready!'))
{% endhighlight %}

> `event` is a useful object. Most importantly, we can extract data sent by requests. Here, we're grabbing the `name` property from the incoming `data` and using it to form what we return.

Let's change the request too so that we're sending `name` now.

{% highlight diff %}
const sayHello = remit.request('hello')
- sayHello().then(console.log)
+ sayHello({ name: 'Jack '}).then(console.log)
{% endhighlight %}

Cool. We'll give that a try:

{% highlight bash %}
# Terminal A
$ node endpoint.js
Ready!

# Terminal B
$ node request.js
Hello, Jack!
{% endhighlight %}

Woohoo! That's some easy request/response sorted. How about we add a Listener and an Emitter in to the mix?

### Adding an Emitter

A great example of the use of a listener is for sending emails. Let's first update our Endpoint to emit a message when `'hello'` is requested.

{% highlight diff %}
+ const emitSaidHello = remit.emit('saidHello')

remit.endpoint('hello')
-	.handler(event => `Hello, ${event.data.name}!`)
+	.handler(async (event) => {
+		await emitSaidHello(event.data.name)
+
+		return `Hello, ${event.data.name}!`
+	})
	.start()
	.then(() => console.log('Ready!'))
{% endhighlight %}

Great! Now when `'hello'` is requested, we emit that `event.data.name` said hello (and `await` that emission to be sent to the server) and then return the same data as before. For the requestor, nothing has changed, but now our system can hook in to that `saidHello` emission and do exciting things!

### Create a listener

Because no listeners are currently set up, any `saidHello` emissions sent will go to the server where it will find that nothing wants it, so it'll be dropped and discarded. Once we set up our first listener, this will become a long-lived queue that our emailing consumer can pull from to do its work. Let's set up a file called `listener.js` now:

{% highlight js %}
// listener.js
const Remit = require('@jpwilliams/remit') // import remit
const remit = Remit({ name: 'emailer' }) // connect to remit as `emailer`

// create a new listener
remit.listen('saidHello') // listen to 'saidHello' events
	.handler((event) => {
		// email the user when we get a message
		console.log(`Sending hello email to: ${event.data}@company.com`)
	})
	.start() // start the listener
	.then(() => console.log('Ready!')) // log when it's booted up
{% endhighlight %}

Fantastic! Now try starting your `endpoint.js` and `listener.js`, then make a request using `request.js`. When the request is made, your listener should log that it's sending an email and the endpoint should return the welcome as normal!
