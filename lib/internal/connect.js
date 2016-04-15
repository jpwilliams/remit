'use strict'

const amqplib = require('amqplib')

module.exports = function __connect (callback) {
    const self = this

    amqplib.connect(self._url, {
        heartbeat: 60
    }).then((connection) => {
        self._connection = connection
        self.__emit('connect', connection)
    }).catch((err) => {
        self.__emit('error', err)
    })
}
