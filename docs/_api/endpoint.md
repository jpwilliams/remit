---
layout: default
title: "Endpoint"
order: 3
---

# Endpoint

An `endpoint` is a way of providing a function accessible using a [request][request]. A single request will only ever be routed to a single endpoint.

{% highlight js %}
const logRequest = await remit
  .endpoint('log.request', console.log)
  .start()
{% endhighlight %}

### Create and start an endpoint

`remit.endpoint(event[, ...handlers])` creates a new endpoint that responds to [requests][request] to `event`. Options can be passed in straight away by passing an object in place of `event`. If an object is passed, the `event` key is required. See `endpoint.options` for available options.

Handlers are a list of functions that will process the incoming data and return a result. For more information on handlers for both endpoints and listeners, see the [Handlers][handlers] guide.

{% highlight js %}
// create and start an endpoint
const getUserByIdEndpoint = remit
  .endpoint('user.getById', (event) => {
    if (!event.data.id) throw new Error('No ID provided to retrieve!')
    const { id } = event.data

    return getUserSomehow(id)
  })
  .start()

// Or just a simple value return
const sayHi = remit
  .endpoint('say.hi', 'Hi!')
  .start()
{% endhighlight %}

### Set options

### Pause and resume

### Add listeners

`endpoint.on` can be used to register listeners for events specific to a created endpoint. See the [Events][events] page for more information on the events emitted.

Returns a reference to the `endpoint` so that calls can be chained.
