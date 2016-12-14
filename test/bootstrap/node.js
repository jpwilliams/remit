var chai = require('chai')

var sinon_chai = require('sinon-chai')
chai.use(sinon_chai)

global.sinon = require('sinon')
global.expect = chai.expect