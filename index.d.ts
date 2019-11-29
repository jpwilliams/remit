import { Tracer } from 'opentracing'
import { Namespace } from 'cls-hooked'
import { ListenerFn } from 'eventemitter3'
import { Connection } from 'amqplib'

interface RemitOptions {
	exchange?: string
	name?: string
	url?: string
	tracer?: Tracer
	namespace?: Namespace
	connection?: Connection
}

declare function remit(options?: RemitOptions): remit.Remit

declare namespace remit {
	type RequestCreator = (event: string | RequestOptions) => Request

	interface RequestWrapper extends RequestCreator {
		on(event: 'sent' | 'error' | 'success' | 'data' | 'timeout', fn: ListenerFn, context?: any): this
	}

	type EmitCreator = (event: string | EmitterOptions) => Emitter

	interface EmitWrapper extends EmitCreator {
		on(event: 'sent', fn: ListenerFn, context?: any): this
	}

	type EndpointCreator = (event: string | EndpointOptions, ...handlers: EndpointHandler[]) => Endpoint

	interface EndpointWrapper extends EndpointCreator {
		on(event: 'data' | 'sent', fn: ListenerFn, context?: any): this
	}

	type ListenerCreator = (event: string | ListenerOptions, ...handlers: ListenerHandler[]) => Listener

	interface ListenerWrapper extends ListenerCreator {
		on(event: 'data', fn: ListenerFn, context?: any): this
	}

	export interface Remit {
		request: RequestWrapper
		emit: EmitWrapper
		endpoint: EndpointWrapper
		listen: ListenerWrapper
		on(event: 'sent' | 'error' | 'success' | 'data' | 'timeout', fn: ListenerFn, context?: any): this
		version: string
	}

	export interface Event {
		eventId: string
		eventType: string
		resource: string
		data: any
		started?: Date
		context?: any
		scheduled?: Date
		delay?: number
		resourceTrace?: string
		timestamp?: Date
	}
	
	export interface RequestOptions {
		timeout?: string | number
		event?: string
		priority?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
	}

	export interface ListenerOptions {
		event?: string
		queue?: string
		prefetch?: number
		subscribe?: boolean
	}

	export interface EmitterOptions {
		event?: string
		delay?: string | Date | number
		priority?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
	}
	
	export interface EndpointOptions {
		event?: string
		queue?: string
		prefetch?: number
	}

	export type Handler = (event: remit.Event) => any
	export type EndpointHandler = Handler
	export type ListenerHandler = Handler

	export type SendRequest = (data?: any, opts?: remit.RequestOptions) => Promise<any>

	export interface Request extends SendRequest {
		options(options: remit.RequestOptions): this
		fallback(data?: any): this
		ready(): Promise<this>
		send: SendRequest
		on(event: 'sent' | 'error' | 'success' | 'data' | 'timeout', fn: ListenerFn, context?: any): this
	}

	export type SendEmission = (data?: any, opts?: remit.EmitterOptions) => Promise<any>

	export interface Emitter extends SendEmission {
		options(options: remit.EmitterOptions): this
		ready(): Promise<this>
		send: SendEmission
		on(event: 'sent', fn: ListenerFn, context?: any): this
	}
	
	export interface Endpoint {
		options(options: EndpointOptions): this
		handler(...handlers: EndpointHandler[]): this
		start(): Promise<this>
		resume(): Promise<this>
		pause(cold: boolean): Promise<this>
		on(event: 'data' | 'sent', fn: ListenerFn, context?: any): this
	}

	export interface Listener {
		options(options: ListenerOptions): this
		handler(...handlers: ListenerHandler[]): this
		start(): Promise<this>
		resume(): Promise<this>
		pause(cold: boolean): Promise<this>
		on(event: 'data', fn: ListenerFn, context?: any): this
	}
}

export = remit
