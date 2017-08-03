const remit = require('../../')({
  name: 'examples.requestPromises'
})

remit.request.data(() => {
  console.log('Got data')
})

remit.request.sent(() => {
  console.log('Sent request')
})

console.log(remit.request)

const myRequest = remit
  .request('my.worker.queue.2')
  .data((err, result) => {
    console.log('request.data #1', err, result)
  })
  .sent(function () {
    console.log('request.sent #1')
  })

remit
  .endpoint('my.worker.queue.2')
  .data((event, callback) => {
    event.data.baz = (event.data.baz || '') + 'qux'

    return callback(null, event.data)
  })
  .ready().then(() => {
    myRequest.data((err, result) => {
      console.log('request.data #2', err, result)
    })

    return myRequest({foo: 'bar'})
  }).then((result) => {
    console.log('request promise #1', result)

    return myRequest(result)
  }).then((secondResult) => {
    console.log('request promise #2', secondResult)

    return remit
      .request('my.worker.queue.2')
      .send({qux: 'quququ'})
  }).then((thirdResult) => {
    console.log('request promise #3', thirdResult)
  }).catch((err) => {
    console.log('request promise err #1', err)
  })
