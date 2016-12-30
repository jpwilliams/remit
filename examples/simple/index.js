const Remit = require('../../')

const remit = Remit({
  name: 'examples.simple'
})

const foo = remit
  .request('my.worker.endpoint')
  .data((err, result) => {
    console.log(err, result)
  })

Promise.all([
  remit
    .endpoint('my.worker.endpoint')
    .data((event, callback) => {
      event.data.baz = 'qux'

      console.log('Emitting...')
      remit.emit('my.worker.listener.hit').send(event)
      console.log('Emitted.')

      return callback(null, event.data)
    })
    .ready(),

  remit
    .listen('my.worker.listener.hit')
    .data((event, callback) => {
      console.log(`Detected that "${event.eventType}" was hit by "${event.resource}" at ${event.timestamp}`)

      return callback()
    })
    .ready(),

  remit
    .listen('my.worker.listener.hit')
    .data(() => {
      console.log(`Proving we can listen to two things...`)
    })
    .data(() => {
      console.log('...and have multiple listeners for each.')
    })
    .data((event, callback) => {
      return callback()
    }).ready()
]).then(() => {
  setInterval(() => {
    foo({foo: 'bar'})
  }, 3000)
})
