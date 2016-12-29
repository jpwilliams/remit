const Remit = require('../../')

const remit = Remit({
  name: 'examples.simple'
})

const foo = remit
  .request('my.worker.queue')
  .data((err, result) => {
    console.log(err, result)
  })

remit
  .endpoint('my.worker.queue')
  .data((event, callback) => {
    event.data.baz = 'qux'

    console.log(event)

    return callback(null, event.data)
  })
  .ready(() => {
    foo({foo: 'bar'})
  })
