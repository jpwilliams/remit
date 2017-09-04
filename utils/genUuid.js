const ulid = require('ulid')

function genUuid () {
  return ulid()
}

module.exports = genUuid
