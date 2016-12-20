const Remit = require('../../')
const remit = Remit()
// const memwatch = require('memwatch-next')

// var hd = new memwatch.HeapDiff()

// memwatch.on('leak', (info) => {
//   console.log('LEAK', info)
//   var diff = hd.end()
//   console.log('diff', require('util').inspect(diff, {depth: null}))
// })

// memwatch.on('stats', (stats) => {
//   console.log('Stats', stats)
// })

remit
  .endpoint('my.worker.queue')
  .data((data, callback) => {
    data.baz = 'qux'

    return callback(null, data)
  })
