const Remit = require('../../')
const remit = Remit()

remit
  .endpoint('my.worker.queue')
  .data((event, callback) => {
    event.data.baz = 'qux'

    return callback(null, event.data)
  })
