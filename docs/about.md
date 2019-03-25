---
layout: default
title: About
permalink: /about/
---
Examples are a powerful, visual way of demonstrating functionality, so let's use one: creating a user. When a user's created, I also want to send them a welcome email and notify any of their Facebook friends on the platform that they've registered.

{% highlight js %}
// a user service
const remit = require('remit')({
  name: 'User Service'
})

// set up an emitter we can use to emit that we've created
// a new user.
const emitUserCreated = remit.emit('user.created')

// set up an endpoint that we can hit to create a user
remit
  .endpoint('user.create')
  .handler(createUser)
  .start()

async function createUser (event) {
  const userToCreate = {
    name: event.data.user.name,
    email: event.data.user.email
  }

  const user = createUserInDb(userToCreate)
  emitUserCeated(user)

  return user
}
{% endhighlight %}

---

{% highlight js %}
// an API.
// we'll assume this is an HTTP REST API that's set up to
// recevie requests to create a user. It's going to make
// a request to our Remit endpoint.
const remit = require('remit')({
  name: 'The API'
})

const createUser = remit.request('user.create')

api.post('/user', async (req, res, next) => {
  const user = await createUser(req.body)

  return res.status(200).send(user)
})
{% endhighlight %}

---

{% highlight js %}
// An emailing service. All this service does is listen
// for events and send out relevant emails. One of those
// events is user creation.
//
// Listeners are durable; even if our listener dies, it
// will queue up requests for when it's back online. This
// is perfect for services which must process every event,
// like emails or thumbnail creation.
const remit = require('remit')({
  name: 'Emailer Service'
})

remit
  .listen('user.created')
  .handler(sendWelcomeEmail)
  .start()

async function sendWelcomeEmail (event) {
  const { name, email } = event.data
  sendWelcomeEmailTo(email, name)
}
{% endhighlight %}

---

{% highlight js %}
// Facebook service.
// Here we also listen to the user creation event, using it
// to find and notify their friends that they've registered.
//
// Emitted events (such as 'user.created') go to all registered
// listeners, meaning everyone that's interested gets notified.
const remit = require('remit')({
  name: 'Facebook Service'
})

remit
  .listen('user.created')
  .handler(checkFriends)
  .start()

const getFriendsOnNetwork = remit.request('facebook.getFriends')
const notifyFriend = remit.request('otherservice.notify')

async function checkFriends (event) {
  const { id } = event.data
  const friendsOnNetwork = await getFriendsOnNetwork(id)

  if (friendsOnNetwork.length) {
    return Promise.all(friendsOnNetwork.map((friend) => {
      return notifyFriend(friend)
    }))
  }
}
{% endhighlight %}
