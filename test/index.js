const execSync = require('child_process').execSync;

var prompt = require('prompt');

var remit = require('../index.js')({
	name: 'mocha',
	url: process.env.REMIT_URL || 'amqp://localhost'
})

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
	@sum  - will exist and return the sum.
	@sum_then_double  - will exist and return the dobuled sum.
	@noexist  - will not exist.

Flush pertinent exchanges and queues
*/

describe('Remit', function() {
	before(function(after) {
		prompt.start();

		var message = chalk.red.bold(
			'Proceeding will remove your rabbitmq node from any cluster it belongs to, removes all data from the management database, such as configured users and vhosts, and deletes all persistent messages. Do you wish to proceed?'
		)

		var property = {
			name: 'resetCmd',
			message: message,
			validator: /yes|no/,
			warning: 'Must respond `yes` or `no`',
			default: 'no'
		};

		prompt.get(property, function(err, result) {
			if (result && result.resetCmd == 'yes') {
				execSync('rabbitmqctl stop_app; rabbitmqctl reset; rabbitmqctl start_app', {
					stdio: [0, 1, 2]
				})
			} else {
				process.exit(1);
			}

			remit.res('noop', (_, done) => done())

			after()
		});
	})

	describe('#connect', function() {
		it('should connect to rabbitmq', function(done) {
			remit.__connect(done)
		})
	})

	describe('#res', function() {
		it('should create `sum` queue', function(done) {
			amqp.connect('amqp://localhost')
				.then(connection => {
					return connection.createChannel()
						.then((channel) => {
							remit.res('sum', function(nums, done) {
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

		it('should create `sum_then_double` queue', function(done) {
			amqp.connect('amqp://localhost')
				.then(connection => {
					return connection.createChannel()
						.then((channel) => {
							remit.res('sum_then_double', [
								function(nums, done) {
									return done(null, nums.reduce((a, b) => a + b))
								},
								function(sum, done) {
									return done(null, sum*2)
								}
							])
							return channel
						})
						.delay(500)
						.tap(channel => channel.checkQueue('sum_then_double'))
						.then(() => done())
						.ensure(() => connection.close())
				});
		})
	})

	describe('#req', function() {
		it('should create `remit` exchange', function(done) {
			amqp.connect('amqp://localhost')
				.then(connection => {
					return connection.createChannel()
						.tap(channel => channel.checkExchange('remit'))
						.ensure(() => connection.close())
						.then(() => done())
				});
		})

		it('should timeout after set period of 100ms', function(done) {
			remit.req('noexist', {}, function(err, result) {
				try {
					assert.equal(err.message, 'Timed out after no response for 100ms')
					done();
				} catch (err) {
					done(err);
				}
			}, {
				timeout: 100
			})
		})

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

		it('should request `sum` again', function(done) {
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

		it('should request `sum_then_double`', function(done) {
			setTimeout(function() {
				remit.req('sum_then_double', [7, 3], function(err, result) {
					try {
						assert.equal(result, 20)
						done();
					} catch (err) {
						done(err);
					}
				})
			}, 200)
		})

		it('should request `sum_then_double` again', function(done) {
			setTimeout(function() {
				remit.req('sum_then_double', [7, 3], function(err, result) {
					try {
						assert.equal(result, 20)
						done();
					} catch (err) {
						done(err);
					}
				})
			}, 200)
		})
	})

	describe('#listen', function() {
		it('should create `greeting` queue', function(done) {
			amqp.connect('amqp://localhost')
				.then(connection => {
					return connection.createChannel()
						.then((channel) => {
							remit.listen('greeting', function(_, done) {
								return done(null, "Hello there!")
							})
							return channel
						})
						.delay(200)
						.tap(channel => channel.checkQueue(`greeting:emission:${remit._service_name}:${remit._listener_counts.greeting}`))
						.then(() => done())
						.ensure(() => connection.close())
				});
		})
	})

	describe('#emit', function() {
		it('should emit message', function(done) {
			remit.emit('greeting')

			amqp.connect('amqp://localhost')
				.then(connection => {

					return connection.createChannel()
						.delay(200)
						.tap(channel => channel.get(`greeting:emission:${remit._service_name}:${remit._listener_counts.greeting}`))
						.ensure(() => connection.close())
						.then(() => done())
				})
		})
	})
})
