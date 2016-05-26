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
			args: {url: 'amqp://local'},
			expected: {name: '', url: 'amqp://local', exchange: 'remit', lazy: false}
		}, {
			args: {lazy: true, exchange: 'test'},
			expected: {name: '', url: 'amqp://localhost', exchange: 'test', lazy: true}
		}, {
			args: {lazy: '', url: 12345, exchange: []},
			expected: {name: '', url: 'amqp://localhost', exchange: 'remit', lazy: false}
		}]
				
		Array.from(option_choices).forEach(function (test) {
			describe(`with options: ${JSON.stringify(test.args)}`, function() {
				var remit
				
				beforeEach(function(done) {
					remit = Remit(test.args)
					
					return done()
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

	describe('#connect', function() {
		beforeEach(function(done) {
			remit = Remit()
			
			return done()
		})
		
		it('should connect to rabbitmq', function(done) {
			remit.__assert('connection', () => {
                done()
            })
		})
	})

	describe('#res', function() {
		beforeEach(function(done) {
			remit = Remit()
			
			return done()
		})
		
		it('should create `sum` queue', function(done) {
			amqp.connect('amqp://localhost')
				.then(connection => {
					return connection.createChannel()
						.then((channel) => {
							remit.res('sum', function(done, nums) {
								return done(null, nums.reduce((a, b) => a + b))
							})
							return channel
						})
						.delay(500)
						.tap(channel => channel.checkQueue('sum'))
						.then(() => done())
						.ensure(() => connection.close())
				});
		})
	})

	describe('#req', function() {
		beforeEach(function(done) {
			remit = Remit()
			
			return done()
		})
		
		it('should create `remit` exchange', function(done) {
			amqp.connect('amqp://localhost')
				.then(connection => {
					return connection.createChannel()
						.tap(channel => channel.checkExchange('remit'))
						.ensure(() => connection.close())
						.then(() => done())
				});
		})

		// it('should timeout after set period of 100ms', function(done) {
		// 	remit.req('noexist', {}, function(err, result) {
		// 		try {
		// 			assert.equal(err.message, 'Timed out after no response for 100ms')
		// 			done();
		// 		} catch (err) {
		// 			done(err);
		// 		}
		// 	}, {
		// 		timeout: 100
		// 	})
		// })

		it('should request `sum`', function(done) {
			setTimeout(function() {
				remit.req('sum', [7, 3], function(err, result) {
					try {
						assert.equal(result, 10)
						done();
					} catch (err) {
						done(err);
					}
				})
			}, 200)
		})
	})

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
