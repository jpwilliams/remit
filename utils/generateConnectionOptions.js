const os = require('os')
const packageJson = require('../package.json')

function generateConnectionOptions (name) {
  return {
    noDelay: true,
    clientProperties: {
      connection_name: name,
      powered_by: `${packageJson.name}@${packageJson.version} (${packageJson.repository.url.substr(0, packageJson.repository.url.length - 4)}/tree/${packageJson.version})`,
      repository: packageJson.repository.url,
      package: `https://www.npmjs.com/package/${packageJson.name}`,
      host: {
        name: `${os.userInfo().username}@${os.hostname()}`,
        platform: `${os.type()}@${os.release()}`,
        pid: process.pid,
        node: process.version
      }
    }
  }
}

module.exports = generateConnectionOptions
