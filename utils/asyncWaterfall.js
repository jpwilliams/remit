// TODO how should middleware work?
// do we _always_ just pass back the event, making
// users mutate that to pass data along?
// that would be similar to req/res in express,
// which is good.
// or should we allow manually passing data by using
// list.shift()?
const serializeError = require('serialize-error')

function waterfall (...fns) {
  return async function (event) {
    let result

    try {
      for (const fn of fns) {
        result = await fn(event)

        if (result !== undefined) {
          return [null, result]
        }
      }

      return [null, result]
    } catch (e) {
      console.error(e)
      const err = (e instanceof Error) ? serializeError(e) : e

      return [err, null]
    }
  }
}

module.exports = waterfall
