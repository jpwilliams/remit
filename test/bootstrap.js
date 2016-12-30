const chai = require('chai')
const sinonChai = require('sinon-chai')
const Remit = require('../')

chai.use(sinonChai)

global.sinon = require('sinon')
global.expect = chai.expect
global.remit = Remit()
