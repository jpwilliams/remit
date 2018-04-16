---
layout: default
title: "Request"
order: 2
---
# Request

A `request` is a method of retrieving data from an [endpoint][endpoint]. It expects a response and therefore won't be queued. If an endpoint is not available to answer the request within a specified time, it will time out.

The best practice for creating requests is to create them once and reuse.

{% highlight js %}
// set up a request to get users by their ID
const getUser = remit.request('user.getById')

// use it again and again!
const user123 = await getUser(123)
const user456 = await getUser(456)
{% endhighlight %}

### Create and sending a request

`remit.request(event[, options])` creates a new requester for data from an [endpoint][endpoint] dictated by `event`. Options can be passed in straight away by passing an object. If an object is passed, `event` is required. See `request.options` for available options.

The best practice for requests is to create them once and reuse them. Creation returns a function which, when run, returns a promise that's either resolved or rejected depending on whether the request succeeded or failed.

{% highlight js %}
// create a request
const getUser = remit.request('user.getById')

// send the request, getting user '123'
try {
  var user = await getUser(123)
} catch (e) {
  // request timed out or returned an error
}

// the `send()` function is the same as running the request directly
const user = await getUser.send(456)
{% endhighlight %}

`data` can be anything that plays nicely with [JSON.stringify][json-stringify]. If `data` is not defined, `null` is sent (`undefined` cannot be parsed into JSON).

`options`, if defined, only apply to that single sent request and have no effect on the `request` as a whole.

### Set options

`request.options(options)` allows you to set the current options for the request. This can be done at any point in a `request`'s life but will not affect timeouts for requests that have already been sent.

{% highlight js %}
const getUser = remit
  .request('user.getById')
  .options({
    timeout: 5000
  })

// can also set on creation; `event` is required
const getPost = remit.request({
  event: 'post.getById',
  priority: 8
})
{% endhighlight %}

### Set a fallback

`request.fallback(data)` specifies data to be returned if a request fails for any reason. Can be used to gracefully handle failing calls across multiple requests. When a fallback is set, any request that fails will instead resolve successfully with the data passed to this function.

{% highlight js %}
const listUsers = remit
  .request('user.list')
  .fallback([])
  .on('error', console.error)
{% endhighlight %}

While the fallback will be returned in place of an error, the `request` will still emit an `error` event, so it's good practice to log that to see what's going wrong.

The fallback can be changed at any point in a `request`'s life and can be unset by passing no arguments to the function.

Returns areference to the `request` so that calls can be chained.

### Add listeners

`request.on` can be used to register listeners for events specific to a created request. See the [Events][events] page for more information on the events emitted.

Returns a reference to the `request` so that calls can be chained.

### Wait for a request to be ready

When a request is created, it needs a short amount of time to set up. This is part of the reason why best practice dictates that you reuse requests rather than creating new ones every time (see [Internals][internals]).

To check when this is done, you can use `request.ready()`, which returns a promise which resolves when the request is ready to make calls.

{% highlight js %}
const getUser = await remit
  .request('user.getById')
  .ready()

// ready to make calls
{% endhighlight %}

Any calls made before this promise is resolved will be queued and sent when it's ready.

Returns a reference to the `request` so that calls can be chained.
