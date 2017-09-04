const packageJson = require('../package.json')

function generateConnectionOptions (name) {
  return {
    clientProperties: {
      connection_name: name,
      powered_by: `${packageJson.name}@${packageJson.version} (${packageJson.repository.url.substr(0, packageJson.repository.url.length - 4)}/tree/${packageJson.version})`,
      repository: packageJson.repository.url,
      package: `https://www.npmjs.com/package/${packageJson.name}`
    }
  }
}

module.exports = generateConnectionOptions
