const execSync = require('child_process').execSync;

var prompt = require('prompt');

var Remit = require('../index')

var amqp = require('amqplib')

var chalk = require('chalk');

var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;

chai.config.includeStack = true;

/*

TO-DO: Once remit supports promises (or event emitters) refactor to avoid using timeouts.


Before hook will:
Create endpoints:
	@noop - will exist but not do much.
	@sum  - will exist and return a sum.
	@noexist  - will not exist.

Flush pertinent exchanges and queues
*/

describe('Remit', function() {
	var amqpcon
	
	before(function(after) {
		amqp.connect('amqp://localhost').then((connection) => {
			amqpcon = connection
			
			return after()
		})
	})
	
	// before(function(after) {
	// 	prompt.start();

	// 	var message = chalk.red.bold(
	// 		'Proceeding will remove your rabbitmq node from any cluster it belongs to, removes all data from the management database, such as configured users and vhosts, and deletes all persistent messages. Do you wish to proceed?'
	// 	)

	// 	var property = {
	// 		name: 'resetCmd',
	// 		message: message,
	// 		validator: /yes|no/,
	// 		warning: 'Must respond `yes` or `no`',
	// 		default: 'no'
	// 	};

	// 	prompt.get(property, function(err, result) {
	// 		if (result && result.resetCmd == 'yes') {
	// 			execSync('rabbitmqctl stop_app; rabbitmqctl reset; rabbitmqctl start_app', {
	// 				stdio: [0, 1, 2]
	// 			})
	// 		} else {
	// 			process.exit(1);
	// 		}

	// 		remit.res('noop', (_, done) => done())

	// 		after()
	// 	});
	// })
	
	describe('#init', function() {
		var option_choices = [{
			args: true,
			expected: {name: '', url: 'amqp://localhost', exchange: 'remit', lazy: false}
		}, {
			args: false,
			expected: {name: '', url: 'amqp://localhost', exchange: 'remit', lazy: false}
		}, {
			args: [],
			expected: {name: '', url: 'amqp://localhost', exchange: 'remit', lazy: false}
		}, {
			args: 0,
			expected: {name: '', url: 'amqp://localhost', exchange: 'remit', lazy: false}
		}, {
			args: '',
			expected: {name: '', url: 'amqp://localhost', exchange: 'remit', lazy: false}
		}, {
			args: 'test',
			expected: {name: '', url: 'amqp://localhost', exchange: 'remit', lazy: false}
		}, {
			args: {},
			expected: {name: '', url: 'amqp://localhost', exchange: 'remit', lazy: false}
		}, {
			args: {url: 'amqp://127.0.0.1'},
			expected: {name: '', url: 'amqp://127.0.0.1', exchange: 'remit', lazy: false}
		}, {
			args: {lazy: true, exchange: 'test'},
			expected: {name: '', url: 'amqp://localhost', exchange: 'test', lazy: true}
		}, {
			args: {lazy: '', url: 12345, exchange: []},
			expected: {name: '', url: 'amqp://localhost', exchange: 'remit', lazy: false}
		}, {
			args: {lazy: true, url: 'amqp://my.big.domain.com:4441', exchange: 'remmydanton', name: 777},
			expected: {name: '', url: 'amqp://my.big.domain.com:4441', exchange: 'remmydanton', lazy: true}
		}, {
			args: {lazy: false, url: 'amqp://my.big.domain.com:4441:123', name: 'big#billservice'},
			expected: {error: 'service name contains invalid characters', name: 'big#billservice', url: 'amqp://my.big.domain.com:4441:123', exchange: 'remit', lazy: false}
		}, {
			args: {lazy: false, url: 'amqp://my.big.domain.com:4441:123', name: 'my-really-long-test-service-thats-going-to-well-exceed-the-sensible-limit-even-though-all-i-wanted-to-make-was-a-simple-todo-app'},
			expected: {error: 'service name too long', name: 'big#billservice', url: 'amqp://my.big.domain.com:4441:123', exchange: 'remit', lazy: false}
		}]
				
		Array.from(option_choices).forEach(function (test) {
			describe(`with options: ${JSON.stringify(test.args)}`, function() {
				var remit
				
				if (test.expected.error) {
					function init () {
						remit = Remit(test.args)
						
						return
					}
					
					return it(`should throw an error: ${test.expected.error}`, function () {
						expect(init).to.throw(Error)
					})
				}
				
				it(`should create a valid Remit instance`, function () {
					remit = Remit(test.args)
				})
				
				it(`should have a service name of "${test.expected.name}"`, function() {
					expect(remit).to.have.property('_service_name').and.equal(test.expected.name)
				})
				
				it(`should have an AMQP URL of "${test.expected.url}"`, function() {
					expect(remit).to.have.property('_url').and.equal(test.expected.url)
				})
				
				it(`should have an exchange name of "${test.expected.exchange}"`, function() {
					expect(remit).to.have.property('_exchange_name').and.equal(test.expected.exchange)
				})
				
				it(`should have laziness mode ${test.expected.lazy ? 'on' : 'off'}`, function() {
					expect(remit).to.have.property('_lazy').and.equal(test.expected.lazy)
				})
				
				it(`should ${test.expected.lazy ? 'not ' : ''}automatically connect`, function (done) {
					setTimeout(function () {
						if (test.expected.lazy) {
							expect(remit).to.not.have.deep.property('_entities.connection')
						} else {
							expect(remit).to.have.deep.property('_entities.connection')
						}
						
						return done()
					}, 10)
				})
			})
		})
	})
	
	describe('#respond', function () {
		var remit = Remit({
			name: 'test-service'
		})
		
		it('should be a function', function () {
			expect(remit.respond).to.be.a('function')
		})
		
		it('should have a "data" function', function () {
			expect(remit.respond.data).to.be.a('function')
		})
		
		it('should have a "res" alias', function () {
			expect(remit.res).to.equal(remit.respond)
		})
		
		it('should have an "endpoint" alias', function () {
			expect(remit.endpoint).to.equal(remit.respond)
		})
		
		describe('init', function () {
			it('should throw an error: endpoint event required')
			it('should throw an error: endpoint name contains invalid characters')
			it('should throw an error: endpoint name too long')
			it('should create an endpoint object with no callbacks (string event)')
			it('should create an endpoint object with no callbacks (object event)')
			it('should create an endpoint object with one callback')
		})
		
		describe('object', function () {
			var endpoint = remit.res('object-test')
			
			it('should have a "data" function', function () {
				expect(endpoint.data).to.be.a('function')
			})
		})
		
		describe('use', function () {
			var endpoint = remit.res('use-test')
			
			it('should have created a `use-test` queue', function (done) {
				amqpcon.createChannel().then((channel) => {
					return channel	
				}).delay(10).tap((channel) => {
					channel.checkQueue('use-test')
				}).then(() => {
					done()
				})
			})
			
			it('should have 1 consumer of the `use-test` queue')//, function (done) {
			// 	amqpcon.createChannel().then((channel) => {
			// 		return channel
			// 	}).delay(10).tap((channel) => {
			// 		channel.checkQueue('use-test').then((queue) => {
			// 			if (queue.consumerCount !== 1) {
			// 				return done(new Error(`Consumer count was ${queue.consumerCount}`))
			// 			}
						
			// 			return done()
			// 		})
			// 	})
			// })
			
			it('should run the `foo` callback')
			it('should run `foo` then `bar` callbacks')
			it('should no longer be consuming from the `use-test` queue')
			it('should leave the `use-test` queue existing')
		})
		
		describe('global listeners', function () {
			it('should run `foo` global callback')
			it('should run the `foo` global callback and the `bar` local callback')
			it('should matter which order the callbacks are added in')
		})
	})

	// describe('#connect', function() {
	// 	beforeEach(function(done) {
	// 		remit = Remit()
			
	// 		return done()
	// 	})
		
	// 	it('should connect to rabbitmq', function(done) {
	// 		remit.__assert('connection', () => {
    //             done()
    //         })
	// 	})
	// })

	// describe('#req', function() {
	// 	beforeEach(function(done) {
	// 		remit = Remit()
			
	// 		return done()
	// 	})
		
	// 	it('should create `remit` exchange', function(done) {
	// 		amqp.connect('amqp://localhost')
	// 			.then(connection => {
	// 				return connection.createChannel()
	// 					.tap(channel => channel.checkExchange('remit'))
	// 					.ensure(() => connection.close())
	// 					.then(() => done())
	// 			});
	// 	})

	// 	it('should request `sum`', function(done) {
	// 		setTimeout(function() {
	// 			remit.req('sum', [7, 3], function(err, result) {
	// 				try {
	// 					assert.equal(result, 10)
	// 					done();
	// 				} catch (err) {
	// 					done(err);
	// 				}
	// 			})
	// 		}, 200)
	// 	})
	// })

	// describe('#listen', function() {
	// 	it('should create `greeting` queue', function(done) {
	// 		amqp.connect('amqp://localhost')
	// 			.then(connection => {
	// 				return connection.createChannel()
	// 					.then((channel) => {
	// 						remit.listen('greeting', function(_, done) {
	// 							return done(null, "Hello there!")
	// 						})
	// 						return channel
	// 					})
	// 					.delay(200)
	// 					.tap(channel => channel.checkQueue(`greeting:emission:${remit._service_name}:${remit._listener_count}`))
	// 					.then(() => done())
	// 					.ensure(() => connection.close())
	// 			});
	// 	})
	// })

	// describe('#emit', function() {
	// 	it('should emit message', function(done) {
	// 		remit.emit('greeting')

	// 		amqp.connect('amqp://localhost')
	// 			.then(connection => {

	// 				return connection.createChannel()
	// 					.delay(200)
	// 					.tap(channel => channel.get(`greeting:emission:${remit._service_name}:${remit._listener_count}`))
	// 					.ensure(() => connection.close())
	// 					.then(() => done())
	// 			})
	// 	})
	// })
})
