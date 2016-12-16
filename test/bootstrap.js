const chai = require('chai')
const sinonChai = require('sinon-chai')

chai.use(sinonChai)

global.sinon = require('sinon')
global.expect = chai.expect
