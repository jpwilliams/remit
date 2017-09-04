function serializeData (data) {
  return JSON.stringify(data.slice(0, 2))
}

module.exports = serializeData
