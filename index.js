const Remit = require('./lib/Remit')

function remit (options) {
  return new Remit(options)
}

module.exports = remit
