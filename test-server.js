'use strict'

const remit = require('./index')({
    name: 'test-service-server',
    url: process.env.REMIT_URL
})

// const log = require('remit-bunyan')('test-service-server', remit)

remit.res('test.replies', (args, done) => {
    console.log('Got a hit...', args, '...replying.')

    return done(null, 'here is the reply')
})
