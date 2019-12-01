---
layout: default
title:  "Installing"
order: 1
---
# Installing

Remit relies on [RabbitMQ][rabbitmq] to be the glue between your microservices. They also provide [easy instructions for installing RabbitMQ][rabbitmq-download] on a multitude of platforms. Here, we'll assume you're running on a MacOS and install it locally using brew.

{% highlight bash %}
brew install rabbitmq
brew services start rabbitmq
{% endhighlight %}

Next, in whatever Node project you're running, use `npm`, `yarn` or a similar package manager to install Remit:

{% highlight bash %}
npm install @jpwilliams/remit --save
{% endhighlight %}

Done!

Next: [Simple example]({{ site.baseurl }}{% link _start/simple-example.md %})

[rabbitmq]: https://www.rabbitmq.com
[rabbitmq-download]: https://www.rabbitmq.com/download.html
