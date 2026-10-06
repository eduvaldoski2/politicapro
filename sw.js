const VERSAO = 'politicapro-v3';
const BASE = ['./', 'index.html', 'app.css', 'app.js', 'icon.svg', 'logo.png', 'flag.png', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// rede primeiro (sempre a versão nova quando online), cache como reserva offline
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(VERSAO).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r)));
});
