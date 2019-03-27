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

`emit.options(options)` allows you to set the current options for the emission. This can be done at any point in an `emit`ter's life but will not affect emissions that have already been sent.

{% highlight js %}
const emitUserCreated = remit
  .emit('user.created')
  .options({

  })

// can also set on creation; `event` is required
const emitPostCreated = remit.emit({
  event: 'post.created',

})
{% endhighlight %}

Available options:

| Option | Type | Required | Default | Description |
| ------------------------------------------------ |
| `event` | _string_ | yes | | Only required if _creating_ an emitter with an options block. |
| `priority` | _integer_ | | `0` | Can be an integer between `0` and `10`. Higher priority emissions will go to the front of queues before lower priority emissions. |
| `schedule` | _Date_ | | | Schedule the earliest an emission should be sent to listeners. Mutually exclusive with `delay`; `schedule` takes priority. See Delaying/scheduling below for more information. |
| `delay` | _integer_ | | | Delay an emission for a minimum amount of time. Mutually exclusive with `schedule`; `schedule` takes priority. See Delaying/scheduling below for more information. |

Returns a reference to the `emit`ter so that calls can be chained.

### Delaying/scheduling

You can delay emissions for an amount of time. They'll be held in a separate messaging queue until they're released, being pushed as normal to the relevant listeners as if had just been emitted.

This is a good alternative to methods like `cron`.

You can `schedule` the emission by providing a _Date_, or `delay` the emission a number of seconds using an _integer_.

### Add listeners

`emit.on` can be used to register listeners for events specific to a created emitter. See the [Events][events] page for more information on the events emitted.

Returns a reference to the `emit`ter so that calls can be chained.

### Wait for an emitter to be ready

No setup is needed to set up an emitter, but as a future-proofing measure you can still use an `emit.ready()` promise to check that it's ready to go.

{% highlight js %}
const emitUserCreated = await remit
  .emit('user.created')
  .ready()

// ready to emit
{% endhighlight %}

Returns a reference to the `emit`ter so that calls can be chained.
