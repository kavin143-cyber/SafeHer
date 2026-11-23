const CACHE_NAME = 'kavalan-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './gps-alarm.js',
  './manifest.json',
  './siren.mp3'
];

// ஆப் இன்ஸ்டால் ஆகும்போது ஃபைல்களை மெமரியில் சேமிக்கும்
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// இன்டர்நெட் இல்லாதபோது சேமித்த ஃபைல்களிலிருந்து ஆப்பை இயக்கும்
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
