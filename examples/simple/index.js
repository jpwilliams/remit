const Remit = require('../../')
const remit = Remit()

const foo = remit
  .request('my.worker.queue')
  .data(() => {
    foo({foo: 'bar'})
  })

remit
  .endpoint('my.worker.queue')
  .data((data, callback) => {
    data.baz = 'qux'

    return callback(null, data)
  })
  .ready(() => {
    foo({foo: 'bar'})
  })
