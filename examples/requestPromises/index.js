const remit = require('../../')({
  name: 'examples.requestPromises'
})

remit.request.data(() => {
  console.log('Got data')
})

const myRequest = remit
  .request('my.worker.queue')
  .data((err, result) => {
    console.log('CALLBACK', err, result)
  })

remit
  .endpoint('my.worker.queue')
  .data((event, callback) => {
    event.data.baz = (event.data.baz || '') + 'qux'

    return callback(null, event.data)
  })
  .ready().then(() => {
    myRequest.data((err, result) => {
      console.log('CALLBACK SECOND', err, result)
    })

    return myRequest({foo: 'bar'})
  }).then((result) => {
    console.log('PROMISE', result)

    return myRequest(result)
  }).then((secondResult) => {
    console.log('PROMISE SECOND', secondResult)

    return remit
      .request('my.worker.queue')
      .send({qux: 'quququ'})
  }).then((thirdResult) => {
    console.log('PROMISE THIRD', thirdResult)
  }).catch((err) => {
    console.log('PROMISE ERR', err)
  })
