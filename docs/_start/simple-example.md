---
layout: default
title:  "Simple example"
order: 2
---
# Simple example

A common interaction between services is a request and a response. We'll test that here by using a Remit `request` and `endpoint`.

{% highlight js %}
// endpoint.js
const remit = require('remit')()
const endpoint = remit
  .endpoint('hello')
  .handler(event => `Hello, ${event.data.name}!`)
  .start()

// request.js
const remit = require('remit')()
const sayHello = remit.request('hello')
sayHello({name: 'Jack'}).then(console.log)
{% endhighlight %}

Here, we create two files: an endpoint called `'hello'` which, when hit, returns `'Hello, NAME!'` and a requester which will hit the endpoint with some data and log the result.

Boom. Done.

If you're happy, take a look [emitters and listeners]({% link _start/installing.md %}). If you'd like a more thorough explanation of the above, read on.

### Create a project

> We'll assume you have a local RabbitMQ running (following the [installation instructions][installation-instructions]).

First, let's create a new project and install Remit. In the terminal:

{% highlight bash %}
mkdir remit-example
cd remit-example
npm init -y
npm install remit --save
{% endhighlight %}


### Create an endpoint

Sorted. Now let's create a new file called `endpoint.js`:

{% highlight js %}
// endpoint.js
const Remit = require('remit') // import remit
const remit = Remit() // connect to remit

// create a new endpoint
const endpoint = remit
  .endpoint('hello') // name it "hello"
  .handler('Hello, world!') // return "Hello, world!" when its hit
  .start() // start it!
  .then(() => console.log('Ready!')) // log when it's booted up
{% endhighlight %}

Super simple! We've got a file ready that boots an endpoint!

### Create a request

Let's now create another file called `request.js` which we'll use to send a request to our `'hello'` endpoint:

{% highlight js %}
// request.js
const Remit = require('remit') // import remit
const remit = Remit() // connect to remit

const sayHello = remit.request('hello') // set up a request that hits the "hello" endpoint
sayHello().then(console.log) // send the request and log what comes back
{% endhighlight %}

When that file is run, it'll send a request to our `'hello'` endpoint. Awesome. Let's give it a try.

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

Right now, this returns a fixed piece of data, `'Hello, world!'`, but let's change that to receive some data. We'll adjust our `endpoint.js` file to use a function for its handler instead.

{% highlight diff %}
const endpoint = remit
  .endpoint('hello')
- .handler('Hello, world!')
+ .handler(event => `Hello, ${event.data.name}!`)
  .start()
  .then(() => console.log('Ready!'))
{% endhighlight %}

`event` is a useful object. Most importantly, we can extract data sent by requests. Here, we're grabbing the `name` property from the incoming `data` and using it to form what we return.

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

Woohoo!

### Further topics

Remit

[installation-instructions]: /docs/getting-started/installing
