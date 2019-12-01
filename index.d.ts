import { Tracer } from 'opentracing'
import { Namespace } from 'cls-hooked'
import { ListenerFn } from 'eventemitter3'
import { Connection } from 'amqplib'

/**
 * Options used when making the initial Remit connection.
 */
interface RemitOptions {
	/** 
	 * The RabbitMQ exchange to use for this Remit instance.
	 * 
	 * @default 'remit'
	 */
	exchange?: string

	/**
	 * This service name will be used for tracing and RabbitMQ to help identify the connection.
	 * 
	 * Defaults to the `REMIT_NAME` environment variable or 'remit'
	 */
	name?: string

	/** 
	 * The URL where RabbitMQ is located.
	 * 
	 * Defaults to the `REMIT_URL` environment variable or 'amqp://localhost'
	 */
	url?: string

	/**
	 * The tracer to be used for this Remit instance.
	 * 
	 * The Jaeger tracer is excellent here.
	 * 
	 * Defaults to a no-op stub tracer.
	 */
	tracer?: Tracer

	/**
	 * The CLS context to be used with this Remit instance.
	 * 
	 * Continuation Local Storage is a method of sharing context across asynchronous calls.
	 * Remit greatly benefits from this for easier tracing for the end user.
	 * 
	 * If you want to share the context with other tracers, provide the CLS namespace here.
	 * 
	 * Internally, Remit sets the 'context' key.
	 */
	namespace?: Namespace

	/**
	 * An existing AMQP connection to be used instead of making a new connection.
	 */
	connection?: Connection
}

/**
 * Remit constructor used to make new Remit instances.
 * 
 * @returns {Remit.Remit} A fresh Remit instance.
 */
declare function Remit(options?: RemitOptions): Remit.Remit

/**
 * A RMIE TEUIT
 */
declare namespace Remit {	
	interface GlobalRequest {
		/**
		 * Used to create a new Request to fetch data from an Endpoint.
		 * These Requests can be re-used many times to request a response from the same Endpoint with differing data.
		 * 
		 * @param event The event that this Request will target to receive data from or a set of options which must also contain `event`.
		 */
		(event: string | RequestOptions): Request
		on(event: 'sent' | 'error' | 'success' | 'data' | 'timeout', fn: ListenerFn, context?: any): this
	}

	interface GlobalEmitter {
		/**
		 * Used to create a new Emitter to emit data to Listeners.
		 * These Emitters can be re-used many times to emit data to Listeners with differing data.
		 * 
		 * @param event The event that this Emitter will emit data to Listeners on or a set of options which must also contain `event`.
	 	 */
		(event: string | EmitterOptions): Emitter
		on(event: 'sent', fn: ListenerFn, context?: any): this
	}

	interface GlobalEndpoint {
		/**
		 * Used to create a new Request to fetch data from an Endpoint.
		 * These Requests can be re-used many times to request a response from the same Endpoint with differing data.
		 * 
		 * Used to create a new Endpoint to listen to data from and respond to Requests.
		 * An Endpoint must be created, a `.handler()` set, and then be `.start()`ed to receive requests.
		 * 
		 * @param event The event that this Endpoint should respond to or a set of options which must also contain `event`.
		 * @param handlers A function or set of functions used to respond to the event. Optional here, but a handler is required to `.start()` the Endpoint.
		 */
		(event: string | EndpointOptions, ...handlers: EndpointHandler[]): Endpoint
		on(event: 'data' | 'sent', fn: ListenerFn, context?: any): this
	}


	interface GlobalListener {
		/**
		 * Used to create a new Listener to listen to data from Emitters.
		 * A Listener must be created, a `.handler()` set, and then be `.start()`ed to receive emissions.
		 * 
		 * @param event The event that this Listener should listen to data from or a set of options which must also contain `event`.
		 * @param handlers A function or set of functions used to handle the incoming data. Optional here, but a handler is required to `.start()` the Listener.
		 */
		(event: string | ListenerOptions, ...handlers: ListenerHandler[]): Listener
		on(event: 'data', fn: ListenerFn, context?: any): this
	}

	/**
	 * An instance of Remit.
	 */
	export interface Remit {
		/**
		 * Used to create a new Request to fetch data from an Endpoint.
		 * These Requests can be re-used many times to request a response from the same Endpoint with differing data.
		 * 
		 * Also offers `.on()`, allowing you to add listeners to all Requests created on this Remit instance.
		 */
		request: GlobalRequest

		/**
		 * Used to create a new Emitter to emit data to Listeners.
		 * These Emitters can be re-used many times to emit data to Listeners with differing data.
		 * 
		 * Also offers `.on()`, allowing you to add listeners to all Emitters created on this Remit instance.
		 */
		emit: GlobalEmitter

		/**
		 * Used to create a new Endpoint to return data to Requests.
		 * An Endpoint must be created, a `.handler()` set, and then be `.start()`ed to receive requests.
		 * 
		 * Also offers `.on()`, allowing you to add listeners to all Endpoints created on this Remit instance.
		 */
		endpoint: GlobalEndpoint

		/**
		 * Used to create a new Listener to listen to data from Emitters.
		 * A Listener must be created, a `.handler()` set, and then be `.start()`ed to receive emissions.
		 * 
		 * Also offers `.on()`, allowing you to add listeners to all Listeners created on this Remit instance.
		 */
		listen: GlobalListener

		/**
		 * Allows you to add listeners to all components of this Remit instance.
		 */
		on(event: 'sent' | 'error' | 'success' | 'data' | 'timeout', fn: ListenerFn, context?: any): this

		/**
		 * The version of the Remit package currently being used.
		 */
		version: string
	}

	/**
	 * A parsed event from an AMQP message.
	 */
	export interface Event {
		/** The unique ID of the message. Also serves as RabbitMQ's internal correlation ID. */
		eventId: string

		/** The routing key that the message used. */
		eventType: string

		/** The `name` of the Remit instance that sent this message. */
		resource: string

		/** The data contained within the event. */
		data: any

		/** If the message is being received on an Endpoint or a Listener, this will be the time at which the message was served to a handler after being pulled from the server and parsed. */
		started?: Date

		/** If the message was scheduled for a specific time, this is the Date for which it was scheduled. */
		scheduled?: Date

		/** If the message was intended to be delayed, this is the amount of time (in milliseconds) that it was intended to be delayed for. */
		delay?: number

		/** The file and line number that the message was triggered from. This could be a file at another process. */
		resourceTrace?: string

		/** The Date at which the message was originally sent. */
		timestamp?: Date
	}
	
	export interface RequestOptions {
		/** The amount of time after which a Request will give up and throw an error. Can be either an integer representing milliseconds or an `ms`-compatible string like '5s' or '1m'. */
		timeout?: string | number
		/** The event that this Request will target to receive data from. */
		event?: string
		/** The priority of the message from 0 to 10. Higher priority messages will be taken off the queue before lower priority ones. A higher number denotes a higher priority. */
		priority?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
	}

	export interface ListenerOptions {
		/** The event that this Listener should listen to data from. */
		event?: string

		/** The queue name in RabbitMQ is generated based on the `event` provided. You can use this to customise the queue name created in RabbitMQ to this string. */
		queue?: string

		/**
		 * The maximum number of unhandled messages the Listener will pull from RabbitMQ.
		 * 
		 * @default 48
		 */
		prefetch?: number

		/** If this is true, an entirely unique, exclusive queue will be generated to consume from, but it will also be deleted upon the listener closing. This is good for creating pubsub-style listeners with no persistence. */
		subscribe?: boolean
	}

	export interface EmitterOptions {
		/** The event that this Emitter will emit data to Listeners on */
		event?: string

		/** The delay after which or the Date at which the message should be available to listeners. The message will be held on RabbitMQ until it's ready. Can be either an integer representing or an `ms`-compatible string like '5s' or '1m' for a delay, or a Date to schedule for a particular time. */
		delay?: string | Date | number

		/** The priority of the message from 0 to 10. Higher priority messages will be taken off the queue before lower priority ones. A higher number denotes a higher priority. */
		priority?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
	}
	
	export interface EndpointOptions {
		/** The event that this Endpoint should respond to */
		event?: string

		/** The queue name in RabbitMQ is generated based on the `event` provided. You can use this to customise the queue name created in RabbitMQ to this string. */
		queue?: string

		/**
		 * The maximum number of unhandled messages the Listener will pull from RabbitMQ.
		 * 
		 * @default 48
		 */
		prefetch?: number
	}

	export type Handler = (event: Remit.Event) => any
	export type EndpointHandler = Handler
	export type ListenerHandler = Handler

	export interface Request {
		/**
		 * Sends the request with the given data. Running the Request itself and running the `.send()` method are the same thing.
		 * 
		 * @param data The data you wish to send. Anything compatibile with JSON.stringify() works here, or a warning will be logged and the data set to NULL. Objects are good here.
		 * @param opts Any options passed in here will take effect for this singular Request only. Good for setting timeouts in very particular circumstances.
		 * 
		 * @returns {Promise<any>} Returns a promise that resolves with the data returned from the Endpoint.
		 */
		(data?: any, opts?: Remit.RequestOptions): Promise<any>

		/**
		 * Change the options of this Request instance.
		 * 
		 * @param options An object of options for the Request.
		 * 
		 * @returns {Request} The instance of Request for chaining purposes.
		 */
		options(options: Remit.RequestOptions): this

		/**
		 * Set fallback data for if a request fails.
		 * If fallback data is set, a request can never reject, but will instead resolve with the fallback data.
		 * The fallback can be unset by running the function with no parameters.
		 * 
		 * If using fallback data, it's a good idea to add an 'error' listener via `.on('error', ...)` to ensure errors aren't lost in the mix.
		 * 
		 * @param data Some fallback data.
		 * 
		 * @returns {Request} The instance of Request for chaining purposes.
		 */
		fallback(data?: any): this

		/**
		 * Return a promise for when the Request is ready to send messages.
		 * This isn't a requirement to watch as any requests sent before we're ready are queued up, but it's sometimes useful to see.
		 * 
		 * @returns {Promise<Request>} A promise which resolves with the instance of Request once the Request is ready.
		 */
		ready(): Promise<this>

		/**
		 * Sends the request with the given data. Running the Request itself and running the `.send()` method are the same thing.
		 * 
		 * @param data The data you wish to send. Anything compatibile with JSON.stringify() works here, or a warning will be logged and the data set to NULL. Objects are good here.
		 * @param opts Any options passed in here will take effect for this singular Request only. Good for setting timeouts in very particular circumstances.
		 * 
		 * @returns {Promise<any>} Returns a promise that resolves with the data returned from the Endpoint.
		 */
		send: (data?: any, opts?: Remit.RequestOptions) => Promise<any>

		/**
		 * Add a listener to the various internal events of this Request instance.
		 * 
		 * @param event The event to listen to.
		 * @param fn The callback to run when the event happens.
		 * 
		 * @returns {Request} The instance of Request for chaining purposes.
		 */
		on(event: 'sent' | 'error' | 'success' | 'data' | 'timeout', fn: ListenerFn, context?: any): this
	}

	export interface Emitter {
		/**
		 * Emits the given data. Running the Emitter itself and running the `.send()` method are the same thing.
		 * 
		 * @param data The data you wish to send. Anything compatibile with JSON.stringify() works here, or a warning will be logged and the data set to NULL. Objects are good here.
		 * @param opts Any options passed in here will take effect for this singular Emitter only.
		 * 
		 * @returns {Promise<any>} Returns a promise that resolves with the internal event sent to Listeners once the message has been sent.
		 */
		(data?: any, opts?: Remit.EmitterOptions): Promise<any>

		/**
		 * Change the options of this Emitter instance.
		 * 
		 * @param options An object of options for the Emitter.
		 * 
		 * @returns {Emitter} The instance of Emitter for chaining purposes.
		 */
		options(options: Remit.EmitterOptions): this

		/**
		 * Return a promise for when the Emitter is ready to send messages.
		 * This isn't a requirement to watch as any emissions sent before we're ready are queued up, but it's sometimes useful to see.
		 * 
		 * @returns {Promise<Emitter>} A promise which resolves with the instance of Emitter once it's ready to send messages.
		 */
		ready(): Promise<this>

		/**
		 * Emits the given data. Running the Emitter itself and running the `.send()` method are the same thing.
		 * 
		 * @param data The data you wish to send. Anything compatibile with JSON.stringify() works here, or a warning will be logged and the data set to NULL. Objects are good here.
		 * @param opts Any options passed in here will take effect for this singular Emitter only.
		 * 
		 * @returns {Promise<any>} Returns a promise that resolves with the internal event sent to Listeners.
		 */
		send: (data?: any, opts?: Remit.EmitterOptions) => Promise<any>

		/**
		 * Add a listener to the various internal events of this Emitter instance.
		 * 
		 * @param event The event to listen to.
		 * @param fn The callback to run when the event happens.
		 * 
		 * @returns {Emitter} The instance of Emitter for chaining purposes.
		 */
		on(event: 'sent', fn: ListenerFn, context?: any): this
	}
	
	export interface Endpoint {
		/**
		 * Change the options of this Endpoint instance.
		 * 
		 * @param options An object of options for the Endpoint.
		 * 
		 * @returns {Endpoint} The instance of Endpoint for chaining purposes.
		 */
		options(options: EndpointOptions): this

		/**
		 * Set the handlers for this Endpoint. If multiple handlers are given, the functions are treated as a chain which the data will be passed through. See the docs for more information on how this is handled.
		 * 
		 * @param handlers A set of functions used to handle incoming data from Requests.
		 * 
		 * @returns {Endpoint} The instance of Endpoint for chaining purposes.
		 */
		handler(...handlers: EndpointHandler[]): this

		/**
		 * Start consuming and processing messages from RabbitMQ.
		 * 
		 * @returns {Promise<Endpoint>} The instance of Endpoint for chaining purposes once the Endpoint is started.
		 */
		start(): Promise<this>

		/**
		 * Resume consumption of messages after being paused.
		 * 
		 * Starts the Endpoint if not already started. Has no effect if already running.
		 * 
		 * @returns {Promise<Endpoint>} A promise that resolves with the Endpoint once the Endpoint has successfully resumed.
		 */
		resume(): Promise<this>

		/**
		 * Pause consumption of messages. Has no effect if the Endpoint is not currently started.
		 * 
		 * @param cold If true, any messages currently being processed will be cancelled and passed back to RabbitMQ to be picked up by another instance. Otherwise no new messages will arrive, but currently-held ones will be processed.
		 * 
		 * @returns {Promise<Endpoint>} A promise that resolves with the Endpoint once consumption has been successfully paused. This does not include any lingering messages if it's a warm pause.
		 */
		pause(cold: boolean): Promise<this>

		/**
		 * Add a listener to the various internal events of this Endpoint instance.
		 * 
		 * @param event The event to listen to.
		 * @param fn The callback to run when the event happens.
		 * 
		 * @returns {Endpoint} The instance of Endpoint for chaining purposes.
		 */
		on(event: 'data' | 'sent', fn: ListenerFn, context?: any): this
	}

	export interface Listener {
		/**
		 * Change the options of this Listener instance.
		 * 
		 * @param options An object of options for the Listener.
		 * 
		 * @returns {Listener} The instance of Listener for chaining purposes.
		 */
		options(options: ListenerOptions): this

		/**
		 * Set the handlers for this Listener. If multiple handlers are given, the functions are treated as a chain which the data will be passed through. See the docs for more information on how this is handled.
		 * 
		 * @param handlers A set of functions used to handle incoming data from Emitters.
		 * 
		 * @returns {Listener} The instance of Listener for chaining purposes.
		 */
		handler(...handlers: ListenerHandler[]): this

		/**
		 * Start consuming and processing messages from RabbitMQ.
		 * 
		 * @returns {Promise<Listener>} The instance of Listener for chaining purposes once the Listener is started.
		 */
		start(): Promise<this>

		/**
		 * Resume consumption of messages after being paused.
		 * 
		 * Starts the Listener if not already started. Has no effect if already running.
		 * 
		 * @returns {Promise<Listener>} A promise that resolves with the Listener once the Listener has successfully resumed.
		 */
		resume(): Promise<this>

		/**
		 * Pause consumption of messages. Has no effect if the Listener is not currently started.
		 * 
		 * @param cold If true, any messages currently being processed will be cancelled and passed back to RabbitMQ to be picked up by another instance. Otherwise no new messages will arrive, but currently-held ones will be processed.
		 * 
		 * @returns {Promise<Listener>} A promise that resolves with the Listener once consumption has been successfully paused. This does not include any lingering messages if it's a warm pause.
		 */
		pause(cold: boolean): Promise<this>

		/**
		 * Add a listener to the various internal events of this Listener instance.
		 * 
		 * @param event The event to listen to.
		 * @param fn The callback to run when the event happens.
		 * 
		 * @returns {Listener} The instance of Listener for chaining purposes.
		 */
		on(event: 'data', fn: ListenerFn, context?: any): this
	}
}

export = Remit
