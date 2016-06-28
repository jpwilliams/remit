module.exports = function __receive_data (message, endpoint) {
    var self = this

    var done_called = false
    var data = self.__parser.request(message)

    var done = function done () {
        if (done_called) {
            return console.trace('Endpoint acknowledgement already done!')
        }
        
        endpoint.__events.emit.apply(endpoint.__events, ['done'].concat(Array.from(arguments)))
    }
    
    done.headers = data.headers

    endpoint.__events.once('done', function response_complete () {
        done_called = true
        var response_data = self.__parser.response.build(data, Array.from(arguments))

        var options = {}

        function ack () {
            self.__assert('consume', function (consume_channel) {
                consume_channel.ack(message)
            })
        }

        function publish () {
            self.__assert('work', function (work_channel) {
                work_channel.checkQueue(data.headers.reply_to, function (err, ok) {
                    if (err) {
                        if (err.message.substr(0, 16) === 'Operation failed') {
                            self.__assert('consume', function (consume_channel) {
                                consume_channel.nack(message, false, false)
                            })
                        } else {
                            publish()
                        }
                    }

                    self.__assert('publish', function (publish_channel) {
                        publish_channel.publish('', data.headers.reply_to, response_data, options)

                        ack()
                    })
                })
            })
        }

        if (!data.headers.correlation_id || (endpoint.master_options && endpoint.master_options.reply === false)) {
            return ack()
        }

        options.correlationId = data.headers.correlation_id

        publish()
    })

    endpoint.__events.emit.apply(endpoint, ['data', done].concat(data.data))
}