'use strict'

// const Emitter = require('events').EventEmitter
//
// const foo = new Emitter().on('bar', () => {
//     console.log('baz')
//
//     throw new Error('quux')
// })
//
// foo.emit('bar')

// const util = require('util')
// const memwatch = require('memwatch-next')

// memwatch.on('leak', (info) => {
//     console.log(info)
// })


const debug = require('debug')('remit')
const _ = require('lodash')

// Grab Remit
const remit = require('./new')({
    lazy: false
})//.on('message', console.error)

// remit.listen('test.listen', (done) => {
//     console.log('FUCKING HELL')
//     done()
// })

remit.res('test.req', (done) => {done()})
    // .on('message', (done) => {
    //     done()
    // })
    // .on('ready', () => {
    //     foo()
    // })

function foo () {
    remit.req('test.req')
        .on('reply', function () {
            foo()
        })
}

foo()

// setInterval(() => {
// function foo() {
    // remit.req({event: 'test.replies'}).on('reply', () => {
    //     console.log('GOD BACK')
    //
    //     // foo()
    // })
// }

// remit.res('test.replies').on('message', (done, username, password) => {
//
// })
//
// remit.res('sum')
//     .on('message', (done, a, b, c, d, e) => {
//         try {
//             return done(null, _.reduce([a, b, c, d, e], (a, b) => {
//                 return a + b
//             }))
//         } catch (e) {
//             return done(e)
//         }
//     })
//     .on('ready', () => {
//         remit.req('sum')
//             .send(15, 17, 29, 132, 1)
//             .on('reply', (err, result) => {
//                 if (err) {
//                     return console.error('Fuck.', err)
//                 }
//
//                 console.log('The result was ::', result)
//             })
//     })


// remit.res('sum', (done, a, b, c, d, e) => {
//     // console.log('ohhhh')
//
//     return done(null, a + b + c + d + e)
// })
//
// function foo () {
//     remit.req('sum', 15, 17, 29, 132, 1, (err, result) => {
//         // console.log('The result was ::', result)
//         foo()
//     })
// }
//
// foo()


// function foo () {
//     const bar = remit.req('test.login')
//         .send('jack', 'pass123')
//         .on('reply', (err, user, success) => {
//             console.log(success, 'Logged in ::', user)
//         })
// }
//
//
// remit.res('test.login').on('message', (done, username, password) => {
//     console.log(`Logging ${username} in with ${password}.`)
//
//     return done(null, {
//         username: 'jack',
//         email: 'jack@tagstr.co',
//         follows: 14,
//         tags: 2
//     }, true)
// }).on('ready', () => {
//     foo()
// })
//
// function foo () {
//     remit.req('test.login', 'jack', 'shhpass123', (err, user, success) => {
//         console.log('Logged in!')
//         console.log(user)
//         console.log(success)
//     })
//
//
//
//
//     remit.req('test.login')
//         .send('jack', 'shhpass123')
//         .on('reply', (err, user, success) => {
//             console.log('Logged in!')
//             console.log(user)
//             console.log(success)
//         })
// }



// setTimeout(() => {
//     const hd = new memwatch.HeapDiff()

//     setTimeout(() => {
//         console.log(util.inspect(hd.end(), false, null))
//     }, 30000)
// }, 5000)

// foo()
// }, 500)
//
// const log = require('remit-bunyan')('test-service', remit)
//
// remit.req('test.replies').on('reply', () => {
//     console.log('Got a reply')
// }).on('fail', (err) => {
//     console.log('Failing...')
//
//     // throw new Error('Fuck')
// })




// remit.listen('test.listening', (args, done) => {
//     console.log('hit first')
//
//     return done(null, 'from the first')
// })
//
// remit.res('test.listening', (args, done) => {
//     console.log('hit second')
//
//     throw new Error('FUCKIT')
//
//     setTimeout(function () {
//         return done(null, 'from the second')
//     }, 3000)
// })

// remit.listen('test.listening', (args, done, extra) => {
//     console.log('hit third')
//
//     setTimeout(function () {
//         debug('Still does its stuff')
//
//         return done(null, 'from the third')
//     }, 6000)
// })

// remit.req('test.listening').on('reply', (err, data) => {
//     debug(err, data)
// })

// We can make a request the usual way.
// Here, there's no `res` listener so it'll time out.
// Because we've used a direct callback, this timeout will be sent
// in the `err` parameter.
// remit.req('test.replies', {
//     username: 'jack'
// }, (err, data) => {
//     console.log(err, data)
// })

// console.log(remit)


// We can also now make a request using listeners.
// This performs exactly the same as the request above, but because
// Remit has detected we're using listeners, it won't return the timeout
// in the 'reply' emission...
// remit.req('test.replies', {
//     username: 'jack'
// }).on('reply', (err, data) => {
//     // console.log('')
//     console.log(err, data)
//     // console.log('')
//     // console.log(remit)
// }).on('timeout', (err) => {
//     console.warn(err)
// })

// console.log('')
// console.log(remit)

//
// // To handle the timeouts, we listen for a different event: 'timeout'.
// remit.req('test.replies', {
//     username: 'jack'
// }).on('reply', (err, data) => {
//     console.log(err, data)
// }).on('timeout', (info) => {
//     console.warn(info)
// })
//
//
// // This should hopefully preserve old functionality so as to not affect old code
// // but also help with odd use cases.
// //
// // For example, we could trigger multiple functions upon a reply and a logging
// // function exclusively for timeouts:
// remit.req('test.replies', {
//     username: 'jack'
// })
//     .on('reply', log_response)
//     .on('reply', save_data)
//     .on('timeout', log_timeout)
//
//
// // That's all done and working, but we'd need to go ahead and do the same for `res`
// // too. The same stuff would apply and allow us to trigger multiple functions
// // in parallel from a single listener.
// remit.res('test.replies')
//     .on('message', reply_to_req)
//     .on('message', log_req)
//     .on('ready', start_service)
