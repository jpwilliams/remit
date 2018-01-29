// make this exception synchronous so we exit
// the node process without having to add a
// adding a listener to unhandledRejection
function throwAsException (e) {
  // returns a promise to stop returning wrong error
  return new Promise(() => {
    process.nextTick(() => {
      throw e
    })
  })
}

module.exports = throwAsException