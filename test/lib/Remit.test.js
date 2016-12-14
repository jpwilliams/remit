var Remit = require('../../lib/Remit')

describe('lib/Remit.js', function () {
    it('should export an initialisation function', function () {
        expect(Remit).to.be.a('function')
    })

    describe('Initialisation', function () {
        it('should not throw if no options given', function () {
            expect(Remit.bind()).to.not.throw()
        })

        it('should throw if service name is too long', function () {
            expect(Remit.bind(Remit, {
                name: 'thisreallylongservicenameshouldbejustoverthelimitbythetimeweredoneheremaybeitllevengetalittlebitoverdependingonmyplan'
            })).to.throw('service name must be')
        })

        it('should throw if service name contains invalid characters', function () {
            expect(Remit.bind(Remit, {
                name: '$$&&'
            })).to.throw('service name must be')
        })

        it('should default URL to localhost if none given', function () {
            var remit = Remit()

            expect(remit._url).to.equal('amqp://localhost')
        })

        it('should throw if invalid URL given')
        it('should add AMQP protocol to URL if no protocol given')
        it('should throw if invalid URL protocol given')

        it('should default the exchange name if none given', function () {
            var remit = Remit()

            expect(remit._exchange_name).to.equal('remit')
        })

        it('should use a custom exchange name if one is given', function () {
            var remit = Remit({
                exchange: 'testexc'
            })

            expect(remit._exchange_name).to.equal('testexc')
        })

        it('should should default to not lazily connecting', function () {
            var remit = Remit()

            expect(remit._lazy).to.equal(false)
        })

        it('should lazily connect if a truthy value is passed', function () {
            var remit = Remit({
                lazy: true
            })

            expect(remit._lazy).to.equal(true)
        })
    })

    describe('Object', function () {
        var remit = Remit()

        it('should expose request', function () {
            expect(remit.request).to.be.a('function')
        })

        it('should expose req', function () {
            expect(remit.req).to.equal(remit.request)
        })
        
        it('should expose transient_request', function () {
            expect(remit.transient_request).to.be.a('function')
        })
        
        it('should expose trequest', function () {
            expect(remit.trequest).to.be.a('function')
            expect(remit.trequest).to.equal(remit.transient_request)
        })
        
        it('should expose treq', function () {
            expect(remit.treq).to.be.a('function')
            expect(remit.treq).to.equal(remit.transient_request)
        })
        
        it('should expose emit', function () {
            expect(remit.emit).to.be.a('function')
        })
        
        it('should expose broadcast', function () {
            expect(remit.broadcast).to.be.a('function')
            expect(remit.broadcast).to.equal(remit.emit)
        })
        
        it('should expose respond', function () {
            expect(remit.respond).to.be.a('function')
        })
        
        it('should expose res', function () {
            expect(remit.res).to.be.a('function')
            expect(remit.res).to.equal(remit.respond)
        })
        
        it('should expose endpoint', function () {
            expect(remit.endpoint).to.be.a('function')
            expect(remit.endpoint).to.equal(remit.respond)
        })
        
        it('should expose listen', function () {
            expect(remit.listen).to.be.a('function')
        })
        
        it('should expose on', function () {
            expect(remit.on).to.be.a('function')
            expect(remit.on).to.equal(remit.listen)
        })
        
    })
})