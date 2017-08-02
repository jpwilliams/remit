const Remit = require('../../')

const remit = Remit({
  name: 'examples.endpointPromises'
})

// Returns the endpoint if a callback is given,
// otherwise a promise.
const endpoint = remit
  .endpoint('my.worker.queue')
  .data((event) => {
    console.log('DATA HIT')

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(event)
      }, 1000)
    })
  })
  .ready(() => {
    console.log('CALLBACK READY')
  })
  .ready()

endpoint.then(() => {
  console.log('PROMISE READY')

  remit
    .request('my.worker.queue')
    .send({foo: 'bar'})
    .then((data) => {
      console.log('REQUEST PROMISE GOT', data)
    })
    .catch((err) => {
      console.log('REQUEST PROMISE THREW', err)
    })
})
