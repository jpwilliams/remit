const Remit = require('../../')
const remit = Remit()

remit
  .endpoint('my.worker.queue')
  .data((data, callback) => {
    data.baz = 'qux'

    return callback(null, data)
  })
