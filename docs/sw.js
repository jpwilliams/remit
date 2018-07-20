---
---
const cachedUrls = []
const currentCache = '{{ site.title | slugify }}-{{ "now" | date: '%s' }}'
console.log('Using cache:', currentCache)

// {% for file in site.static_files %}
//   cachedUrls.push('{{ site.baseurl }}{{ file.path }}')
// {% endfor %}

{% for pg in site.pages %}
  {% if pg.permalink %}
    cachedUrls.push('{{site.baseurl }}{{ pg.permalink }}')
  {% endif %}

  {% if pg.url %}
    cachedUrls.push('{{ site.baseurl }}{{ pg.url }}')
  {% endif %}
{% endfor %}

{% for collection in site.collections %}
  {% for item in site[collection.label] %}
    cachedUrls.push('{{ site.baseurl }}{{ item.url }}')
  {% endfor %}
{% endfor %}

self.addEventListener('install', onInstall)
self.addEventListener('activate', onActivate)
self.addEventListener('fetch', onFetch)

function onInstall (event) {
  event.waitUntil((async () => {
    const cache = await caches.open(currentCache)

    return cache.addAll(cachedUrls)
  })())
}

function onActivate (event) {
  event.waitUntil((async () => {
    const keys = await caches.keys()

    return Promise.all(keys.map((key) => {
      if (key !== currentCache) {
        console.log('Deleting old cached data:', key)

        return caches.delete(key)
      }
    }))
  })())
}

function onFetch (event) {
  const req = event.request

  // don't interrupt calls that aren't GET
  if (req.method !== 'GET') {
    return
  }

  event.respondWith((async () => {
    // start getting from network
    const fetchRes = fetch(req)

    // make sure the service worker stays alive to cache
    // the new content if the fetch succeeds
    event.waitUntil((async () => {
      try {
        const fetchResCopy = (await fetchRes).clone()
        const myCache = await caches.open(currentCache)
        await myCache.put(req, fetchResCopy)
      } catch (err) {
        console.warn('Failed to update cache for', req.url,'-', err)
      }
    })())

    // if the target is HTML, grab fresh content first, then cached.
    // if the target is not HTML, grab cache first, then fresh.
    if (req.headers.get('Accept').includes('text/html')) {
      try {
        return await fetchRes
      } catch (err) {
        return caches.match(req)
      }
    } else {
      const cacheRes = await caches.match(req)

      return cacheRes || fetchRes
    }
  })())
}
