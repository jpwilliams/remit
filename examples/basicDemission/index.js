const remit = require('../../')({
  name: 'examplesBasicDemission'
})

const demit = remit.emit('examples.basic.demission')

remit.listen('examples.basic.demission')
  .data((event, callback) => {
    console.log('Got event', event.eventId, event.delay)

    return callback(null, true)
  })
  .ready().then(() => {
    Array.from([5000, 7000, 1000, 3000, 4000, 5000, 2000, 2000, 2000, 9000, 2000, 10000, 6000, 8000, 30000, 30000, 30000]).forEach((time) => {
      demit({foo: 'bar'}, {
        delay: time
      })
    })
  })
