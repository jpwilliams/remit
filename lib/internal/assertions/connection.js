var debug = require('debug')('remit:connection')
var amqplib = require('amqplib/callback_api')

module.exports = function __assert_connection (callback) {
    var self = this

    debug('Creating new connection')
    
    var options = {
        heartbeat: 60
    }
    
    if (self._service_name) {
        options.clientProperties = {
            connection_name: self._service_name
        } 
    }
    
    amqplib.connect(self._url, options, function (err, connection) {
        if (err) {
            throw err
        }

        debug('Connection created. Emitting success.')
        self._entities.connection = connection
        self.__events.emit.apply(self, ['connection', connection])
    })
}