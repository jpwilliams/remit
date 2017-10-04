// make this exception synchronous so we exit
// the node process without having to add a
// adding a listener to unhandledRejection
function throwAsException (e) {
  process.nextTick(() => {
    throw e
  })
}

module.exports = throwAsException
