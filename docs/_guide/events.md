---
layout: default
title:  Events
order: 2
---
# Events

[`request`](#), [`endpoint`](#), [`emit`](#) and [`listen`](#) all export EventEmitters that emit events about their incoming/outgoing messages.

All of the events can be listened to by using the `.on()` function, providing an `eventName` and a `listener` function, like so:

``` js
const request = remit.request('foo.bar')
const endpoint = remit.endpoint('foo.bar')
const emit = remit.emit('foo.bar')
const listen = remit.listen('foo.bar')

request.on('...', ...)
endpoint.on('...', ...)
emit.on('...', ...)
listen.on('...', ...)
```

Events can also be listened to _globally_, by adding a listener directly to the type. This listener will receive events for all instances of that type. This makes it easier to introduce centralised logging to remit's services.

``` js
remit.request.on('...', ...)
remit.endpoint.on('...', ...)
remit.emit.on('...', ...)
remit.listen.on('...', ...)
```

The following events can be listened to:

| Event | Description | Returns | request | endpoint | emit | listen |
| ----- | ----------- | ------- |  :---:  |   :---:  | :---: | :---: |
| `data` | Data was received | Raw data | ✅ | ✅ | ❌ | ✅ |
| `error` | An error occured or was passed back from an endpoint | Error | ✅ | ✅ | ✅ | ✅ |
| `sent` | Data was sent | The event that was sent | ✅ | ✅ | ✅ | ❌ |
| `success` | The action was successful | The successful result/data | ✅ | ✅ | ✅ | ✅ |
| `timeout` | The request timed out | A [timeout object](#) | ✅ | ❌ | ❌ | ❌ |
