'use strict'

const debug = require('debug')('remit:connection')
const amqplib = require('amqplib')

module.exports = function __assert_connection (callback) {
    const self = this

    debug(`Creating new connection`)
    
    let options = {
        heartbeat: 60
    }
    
    if (self._service_name) {
        options.clientProperties = {
            connection_name: self._service_name
        } 
    }
    
    amqplib.connect(self._url, options).then((connection) => {
        debug(`Connection created. Emitting success.`)
        self._entities.connection = connection
        self.__events.emit.apply(self, ['connection', connection])
    }).catch((err) => {
        throw err
    })
}