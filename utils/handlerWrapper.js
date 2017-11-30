function handlerWrapper (fn) {
  return (event) => {
    return new Promise((resolve, reject) => {
      try {
        if (typeof fn !== 'function') {
          return resolve(fn)
        }

        const r = fn(event, (err, data) => {
          if (err) {
            reject(err)
          } else {
            resolve(data)
          }
        })

        // if they've mapped a callback, _always_ wait for
        // the callback.
        // this helps clear up issues where someone has
        // created an `async` function to use Promises
        // but still mapped the callback to use later.
        // JS is full of mixing these types, so we should
        // be nice and clear on how they're handled
        if (fn.length < 2) {
          if (r && r.then && typeof r.then === 'function') {
            // is a promise
            r.then(resolve).catch(reject)
          } else {
            // is synchronous
            resolve(r)
          }
        }

        // if we're here, it's using a callback, so we'll
        // wait
      } catch (e) {
        reject(e)
      }
    })
  }
}

module.exports = handlerWrapper
