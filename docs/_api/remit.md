---
layout: default
title: "Remit"
order: 1
---
# Remit Constructor

The constructor that's the default export and is used to create a Remit instance.

``` ts
function Remit(options?: RemitOptions): Remit.Remit
```

## RemitOptions

Options used when making the initial Remit connection.

- **name** `string?`<br/>This service name will be used for tracing and RabbitMQ to help identify the connection. Defaults to the `REMIT_NAME` environment variable or `'remit'`.<br/><br/>
- **url** `string?`<br/>The URL where RabbitMQ is located. Defaults to the `REMIT_URL` environment variable or `'amqp://localhost'`.<br/><br/>
- **exchange** `string?`<br/>The RabbitMQ exchange to use for this Remit instance. Defaults to `'remit'`.<br/><br/>
- **tracer**`Tracer?`<br/>The tracer to be used for this Remit instance. The Jaeger tracer is excellent here. Defaults to a no-op stub tracer.<br/><br/>
- **namespace** `Namepsace?`<br/>The CLS context to be used with this Remit instance. Continuation Local Storage is a method of sharing context across asynchronous calls. Remit greatly benefits from this for easier tracing for the end user. If you want to share the context with other tracers, provide the CLS namespace here.<br/><br/>
- **connection** `string?`<br/>An existing AMQP connection to be used instead of making a new connection.

**Returns** [`Remit`](#).

# Remit

An instance of Remit returned after passing connection options to the constructor.

### Properties

#### version `string`

The version of the `@jpwilliams/remit` package currently being used.

### Methods

#### request `(event: string | RequestOptions): Request`

Used to create a new Request to fetch data from an Endpoint.
These Requests can be re-used many times to request a response from the same Endpoint with differing data.

**Example**

``` js
const getUser = remit.request('user')

const getUser = remit.request({
	event: 'user',
	timeout: '10s'
})
```

**Parameters**

- **event** `string | RequestOptions`<br/>The event that this Request will target to receive data from or a set of options which must also contain `event`.

**Returns** [`Request`](#).

---

#### endpoint `(event: string | EndpointOptions, ...handlers: EndpointHandler[]): Endpoint`

Used to create a new Request to fetch data from an Endpoint.
These Requests can be re-used many times to request a response from the same Endpoint with differing data.

Used to create a new Endpoint to listen to data from and respond to Requests.
An Endpoint must be created, a `.handler()` set, and then be `.start()`ed to receive requests.

**Example**

``` js
// Respond to 'hello' events
const endpoint = await remit.endpoint('hello')

// Or maybe add the handler on instantiation
const endpoint = remit.endpoint('hello', event => {
	return `Hello, ${event.data.name}`
})

// Or use options on instantiation
const endpoint = remit.endpoint({
	event: 'hello',
	prefetch: 5
})
```

**Parameters**

- **event** `string | EndpointOptions`<br/>The event that this Endpoint should respond to or a set of options which must also contain `event`.

**Returns** [`Endpoint`](#).





