const remit = require('../../')({
  name: 'requester'
})

remit
  .req('simple.addition')
  .data((err, data) => {
    console.log(err, data)
  })
  .sent((message) => {
    console.log('Sent a message', message)
  })
  .timeout(() => {
    console.log('Timed out waiting')
  })
  .send(1, 5, 7, 9)
