import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
const paths = (await readdir(dist)).filter(name => name !== 'assets' && name !== 'sw.js');
for (const name of await readdir(new URL('assets/', dist))) paths.push(`assets/${name}`);
paths.sort();
const hash = createHash('sha256');
for (const path of paths) hash.update(await readFile(new URL(path, dist)));
const version = hash.digest('hex').slice(0, 16);
await writeFile(new URL('sw.js', dist), `const prefix = 'fe-vocab:' + self.registration.scope + ':';
const cacheName = prefix + '${version}';
const shell = new URL('index.html', self.registration.scope).href;
const assets = ${JSON.stringify(paths)}.map(path => new URL(path, self.registration.scope).href);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith(prefix) && key !== cacheName)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  if (request.mode === 'navigate') {
    event.respondWith(caches.open(cacheName).then(async cache => (await cache.match(shell)) || fetch(request)));
  } else if (assets.includes(request.url)) {
    event.respondWith(caches.open(cacheName).then(async cache => (await cache.match(request.url, { ignoreVary: true })) || fetch(request)));
  }
});
`);
