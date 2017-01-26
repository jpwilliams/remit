const Remit = require('../../')

const remit = Remit({
  name: 'examples.endpointPromises'
})

// Returns the endpoint if a callback is given,
// otherwise a promise.
remit
  .endpoint('my.worker.queue')
  .ready(() => {
    console.log('CALLBACK READY')
  })
  .ready().then(() => {
    console.log('PROMISE READY')
  })
