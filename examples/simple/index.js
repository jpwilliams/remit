const Remit = require('../../')
const remit = Remit()

remit
  .endpoint('my.worker.queue')
  .data((data, callback) => {
    data.baz = 'qux'

    return callback(null, data)
  })
  .ready(() => {
    remit
      .request('my.worker.queue')
      .data((err, result) => {
        console.log('REQUESTER', err, result)
      })
      .send({foo: 'bar'})
  })
