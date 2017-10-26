const ulid = require('ulid').ulid

function genUuid () {
  return ulid()
}

module.exports = genUuid
