const remit = require('../../')({
  name: 'examplesBasicDemission'
})

remit.listen('examples.basic.demission')
  .data((event, callback) => {
    console.log('Got event', event)

    return callback(null, true)
  })
  .ready().then(() => {
    Array.from([5000, 7000, 1000, 3000, 4000, 9000, 2000, 10000, 6000, 8000]).forEach((time) => {
      remit.demit('examples.basic.demission')({foo: 'bar'}, (new Date(+new Date() + time)))
    })
  })
