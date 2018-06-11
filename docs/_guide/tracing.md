---
layout: default
title:  Tracing
order: 6
---
# OpenTracing

![Jaeger Tracing](https://user-images.githubusercontent.com/1736957/41066405-9bf0808e-69d9-11e8-8d2a-b4704ca2731a.png)

Remit supports [OpenTracing](https://opentracing.io)-compatible tracers, pushing data to any compatible backend. More information on the OpenTracing API can be found at [https://opentracing.io](https://opentracing.io).

Officially supported tracers that provide Node.js clients are currently:

- [Jaeger](https://www.jaegertracing.io)
- [LightStep](http://lightstep.com/)
- [Instana](https://www.instana.com/)
- [Datadog](https://www.datadoghq.com/apm/)

# Adding a tracer

Using a tracer with Remit is exceedingly simple. When instantiating Remit, simply pass in a `tracer` option. The example below uses the popular [jaegertracing/jaeger-client-node](https://github.com/jaegertracing/jaeger-client-node).

``` js
const Remit = require('remit')
const { initTracer } = require('jaeger-client')
const serviceName = 'my-traced-service'

// most tracers allow some configuration to choose when to
// take trace samples. This config will ensure traces
// are always created.
const tracer = initTracer({
  serviceName,
  sampler: {
    type: 'const',
    param: 1
  }
})

const remit = Remit({
  name: serviceName,
  tracer
})
```

All calls for this Remit instance will now be traced! Great!

# Namespaces

If attempting to trace multiple libraries/frameworks, you'll need to have them cooperating with each-other to make relevant traces. While the method to perform this [hasn't yet been nailed down](https://github.com/opentracing/specification/issues/23), Remit will provide a solution that's most likely in line with the resulting OpenTracing specification changes.

We currently use [jeff-lewis/cls-hooked](https://github.com/jeff-lewis/cls-hooked) to infer span contexts between Remit calls. This has worked well even previous to the introduction of OpenTracing, so we'll use it again here.

Remit allows you to pass in a `namespace` upon instantiation, so you can have `get`/`set` access to the namespace providing the relevant contexts. If you don't know how these contexts work, I strongly suggest you read the [jeff-lewis/cls-hooked](https://github.com/jeff-lewis/cls-hooked) docs and get a grip on namespaces and contexts before use.

``` js
const Remit = require('remit')
const { Tracer } = require('opentracing')
const cls = require('cls-hooked')

const tracer = new Tracer()
const namespace = cls.createNamespace('tracing')
const remit = Remit({ namespace, tracer })

// Internally, Remit uses the 'context' key to store the current
// span context, so set this to update it.
const span = tracer.startSpan('my-http-request')
namespace.set('context', span.context())
```

This `namespace` API is currently seen as _experimental_ and __will change without a major version bump upon the OpenTracing specificaton decision__.
