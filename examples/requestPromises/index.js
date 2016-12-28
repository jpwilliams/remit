const remit = require('../../')({
  name: 'examples.requestPromises'
})

const myRequest = remit
  .request('my.worker.queue')
  .data((err, result) => {
    console.log('CALLBACK', err, result)
  })

remit
  .endpoint('my.worker.queue')
  .data((data, callback) => {
    data.baz = (data.baz || '') + 'qux'

    return callback(null, data)
  })
  .ready().then(() => {
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

remit.request('my.worker.queue')
