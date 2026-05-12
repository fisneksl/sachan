const CACHE_NAME = 'outcasts2026-v5';
const BASE = '/outcasts2026';

const PRECACHE_URLS = [
  BASE + '/manifest.json',
  BASE + '/icon-192.png',
  BASE + '/icon-512.png',
];

// install: 아이콘·매니페스트만 프리캐시 (index.html 제외)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// activate: 구 캐시 정리
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// fetch
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // index.html + schedule/events — 네트워크 우선, 실패 시 캐시
  const isHtml = url.pathname.endsWith('index.html') || url.pathname === BASE + '/' || url.pathname === BASE;
  const isData = url.pathname.endsWith('schedule.json') || url.pathname.endsWith('events.json');
  if (isHtml || isData) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 나머지(아이콘 등) — 캐시 우선
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
