---
# You don't need to edit this file, it's empty on purpose.
# Edit theme's home layout instead if you wanna make some changes
# See: https://jekyllrb.com/docs/themes/#overriding-theme-defaults
layout: default
---
# Remit

Remit is a RabbitMQ-backed library for building microservices supporting RPC, pubsub, automatic service discovery, tracing and scaling with no code changes.

{% highlight js %}
// service.js
const endpoint = remit.endpoint('user.get')

endpoint.handler((event) => {
  const user = { name: 'Jack Williams' }
  remit.emit('got user', user)

  return user
})

endpoint.start()
{% endhighlight %}

Then in another process...

{% highlight js %}
// api.js
const getUser = remit.request('user.get')
const user = await getUser(123)
// {"name":"Jack Williams"}
{% endhighlight %}

Multiple things could then hook in to the `"got user"` event we emitted...

{% highlight js %}
// listener.js
const listener = remit.listen('got user')

listener.handler((event) => {
  log(`User "${event.data.name}" was requested.`)
})

listener.start()
{% endhighlight %}

### What is it for?

Remit is generically designed for creating separated services which respond to or listen to events. An `endpoint` will wait for and respond to individual `request`s and a `listener` will receive all `emit`s across the entire system.

With that basic model, Remit expands to allow you to:

- Create "services" that respond to messages
- Trace messages flowing through your system and produce distrubuted stack traces
- Group and scale services automatically
- A/B test
- "Event" your system, creating distrubuted hooks you can use at any time, anywhere
- Easily break apart your system, only creating separate "services" when it suits with minimal code changes

### How does it work?

Remit is a wrapper around the fantastic [RabbitMQ][rabbitmq] message broker and tries to be as easy to use as possible. It handles creating the connections, channels and bindings needed for RabbitMQ and provides a pretty API for interacting with your services and messages.

[rabbitmq]: https://rabbitmq.com
