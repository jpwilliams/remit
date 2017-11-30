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
