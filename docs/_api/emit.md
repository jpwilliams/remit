---
layout: default
title: "Emit"
order: 4
---
# Emit

An `emit` is a method of broadcasting an event to the rest of the system which can be listened to by a [listener][listen]. They're synonymous with a distributed version of Node's `EventEmitter`, with the added benefit that they also buffer events for listeners currently offline; emissions never receive responses and so are persisted, meaning a service that has missed X emissions can start up and will be able to process the backlog.

This makes emissions a very good fit for things that should happen following an event. For instance, sending a welcome email when a user is created, or running image processing after an image is uploaded.

{% highlight js %}
// set up an emission to let the system know
// a user has been created
const emitUserCreated = remit.emit('user.created')

// use it again and again!
emitUserCreated({ id: 123, name: 'Jane' })
emitUserCreated({ id: 456, name: 'John' })
{% endhighlight %}

### Create and send an emission

`remit.emit(event[, options])` returns a new emitter that will emit data to any interested [listeners][listen], dictated by `event`. The best practice for emissions is to create them once and reuse them. Creation returns a function which, when run, returns a promise that's either resolved or rejected depending on whether the emission successfully sent.

{% highlight.js %}
// create an emission
const emitUserCreated = remit.request('user.created')

// send the emission
try {
  await emitUserCreated({ id: 123, name: 'Jane' })
} catch (e) {
  // emitting returned an error for some reason
}

// the `send()` function is the same as running the emitter directly
await emitUserCreated.send({ id: 456, name: 'John' })
{% endhighlight %}

The data sent can be anything that plays nicely with [JSON.stringify][json-stringify]. If `data` is not defined, `null` is sent (`undefined` cannot be parsed into JSON).

If `options` are defined after `data` when _emitting_, the options only apply to that single emission and have no effect on the emitter as a whole.

### Set options

### Delaying/scheduling

### Add listeners

### Wait for an emitter to be ready
