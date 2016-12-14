const remit = require('../../')({
  name: 'responder'
})

remit
  .endpoint
  .data((context, ...nums) => {
    remit.emit('simple.addition.hit', nums)
  })

remit
  .endpoint('simple.addition')
  .data(function (context, ...nums) {
    if (Math.random() > 0.5) {
      console.log('Retrying...')

      return context.retry()
    }

    return context(null, nums.reduce((a, b) => (a + b), 0))
  })
