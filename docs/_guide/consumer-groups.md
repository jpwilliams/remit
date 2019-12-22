---
layout: default
title:  Consumer groups
order: 5
---
# Consumer groups

When creating an instance of Remit, a `name` can be given, used as a service name to identify the series of connections and channels in RabbitMQ, as well as showing services it contacts who they're communicating with. A core use of these names, however, is grouping consumers.

Endpoints work as you would expect any request/response system to work. One request goes out, a single relevant Endpoint consumer picks up the work and replies. If another Endpoint consumer boots up to help with the load, it'll watch the same queue as the first and messages will still only be routed to a single consumer.

Listeners, however, all tap in to the same source of events, receiving their own duplicate of the data being produced. Using service names means that a message will be fired to each consumer _group_, rather than each consumer.

## Example

Lets write a set of listeners to hook in to a `user.loggedIn` event.

``` js
// login-watcher.js
const Remit = require('@jpwilliams/remit')
const remit = Remit({ name: 'login-watcher' })

remit.listen('user.loggedIn', console.log).start()
```

If we run this file, a listener will be set up to log any data coming from `user.loggedIn`. Because we set Remit's service `name` to `login-watcher`, we could run any number of services using this file and a message would only go to a single consumer in this `login-watcher` _group_ each time.

Lets set up another service that emails the user telling them they logged in. We'll call it a different name, `login-emailer`.

``` js
// login-emailer.js
const Remit = require('@jpwilliams/remit')
const remit = Remit({ name: 'login-emailer' })

remit.listen('user.loggedIn', (event) => {
	return sendWelcomeEmail(event.data.user.email)
})
```

Let's say we're running ten of each of the above two services. Another service in the system emits a `user.loggedIn` event. Two messages will be produced. The first will go to a single consumer within the `login-watcher` group and the second will go to a single consumer within the `login-emailer` group.
