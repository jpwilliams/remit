const stack = require('callsite')

module.exports = {
  capture: function capture (extendedCapture) {
    return stack().slice(...(extendedCapture ? [6, 8] : [3, 5]))
  },

  parse: function parse (callsites) {
    let callsite

    if (callsites[1]) {
      const filename = callsites[0].getFileName()

      if (filename && filename.substr(-39) === 'node_modules/callable-instance/index.js') {
        callsite = callsites[1]
      } else {
        callsite = callsites[0]
      }
    } else {
      callsite = callsites[0]
    }

    return `${callsite.getFunctionName() || 'Object.<anonymous>'} (${callsite.getFileName()}:${callsite.getLineNumber()}:${callsite.getColumnNumber()})`
  }
}
