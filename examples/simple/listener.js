const remit = require('../../')({
  name: 'listener'
})

remit
  .listen
  .data(context => context())

remit
  .listen('simple.addition.hit')
  .data((context, nums) => {
    console.log('Found', nums)
  })
