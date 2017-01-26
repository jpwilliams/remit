const Remit = require('../../')
const remit = Remit()

const foo = remit
  .request('my.worker.queue')

setInterval(() => {
  foo({foo: 'bar'})
})
