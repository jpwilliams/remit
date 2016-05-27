'use strict'

module.exports = function __receive_data (message, endpoint) {
    const self = this

    let done_called = false
    
    const data = self.__parser.request(message)

    const done = function done () {
        if (done_called) {
            return console.trace('Endpoint acknowledgement already done!')
        }
        
        endpoint.__events.emit.apply(endpoint.__events, ['done'].concat(Array.from(arguments)))
    }
    
    done.headers = data.headers

    endpoint.__events.once('done', function response_complete () {
        done_called = true
        const response_data = self.__parser.response.build(data, Array.from(arguments))

        let options = {}

        function ack () {
            self.__assert('consume', (consume_channel) => {
                consume_channel.ack(message)
            })
        }

        function publish () {
            self.__assert('work', (work_channel) => {
                work_channel.checkQueue(data.headers.reply_to).then(() => {
                    self.__assert('publish', (publish_channel) => {
                        publish_channel.publish('', data.headers.reply_to, response_data, options)
                        
                        ack()
                    })
                }).then(null, (err) => {
                    if (err.message.substr(0, 16) === 'Operation failed') {
                        self.__assert('consume', (consume_channel) => {
                            consume_channel.nack(message, false, false)
                        })
                    } else {
                        publish()
                    }
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