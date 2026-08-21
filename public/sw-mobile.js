// Service Worker optimisé pour mobile
// public/sw-mobile.js

const CACHE_VERSION = 'v2.0.2';
const STATIC_CACHE = `depotmanager-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `depotmanager-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `depotmanager-images-${CACHE_VERSION}`;

// Tailles de cache optimisées pour mobile
const MAX_STATIC_CACHE_SIZE = 50; // 50 MB
const MAX_DYNAMIC_CACHE_SIZE = 20; // 20 MB  
const MAX_IMAGE_CACHE_SIZE = 100; // 100 MB

// Assets critiques pour le démarrage rapide mobile
const CRITICAL_ASSETS = [
  '/',
  '/accueil/ventes/nouveau',
  '/manifest.json',
  '/logos/icon-pwa.svg',
  '/logos/favicon.svg',
  // CSS critiques (inline si possible)
  '/static/css/main.css',
  // JS critiques (chunk principal)
  '/static/js/main.js'
];

// Images communes à mettre en cache
const COMMON_IMAGES = [
  '/images/placeholder-product.webp',
  '/images/placeholder-avatar.webp',
  '/images/default-product.webp'
];

// Installation avec cache stratégique
self.addEventListener('install', (event) => {
  console.log('🔧 Mobile Service Worker installing...');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Caching critical mobile assets');
        return cache.addAll(CRITICAL_ASSETS);
      })
      .then(() => {
        // Précharger les images communes
        return caches.open(IMAGE_CACHE);
      })
      .then((cache) => {
        console.log('🖼️ Preloading common images');
        return cache.addAll(COMMON_IMAGES);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation avec nettoyage intelligent
self.addEventListener('activate', (event) => {
  console.log('🚀 Mobile Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Garder seulement les caches actuels
            if (!cacheName.includes(CACHE_VERSION)) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Stratégies de cache optimisées pour mobile
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(networkOnlyNavigation(request));
    return;
  }
  
  // Stratégie 1: Cache First pour les assets statiques
  if (isStaticAsset(request.url)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }
  
  // Stratégie 2: Cache First pour les images (optimisé mobile)
  if (isImageRequest(request.url)) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
    return;
  }
  
  // Stratégie 3: Network First pour les API critiques
  if (isAPIRequest(request.url)) {
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
    return;
  }
  
  // Stratégie 4: Stale While Revalidate pour le reste
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

// Cache First Strategy (pour assets et images)
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Vérifier si la réponse est encore valide (max 24h pour les images)
    const dateHeader = cachedResponse.headers.get('date');
    if (dateHeader) {
      const cacheAge = (Date.now() - new Date(dateHeader).getTime()) / 1000;
      const maxAge = isImageRequest(request.url) ? 86400 : 3600; // 24h images, 1h autres
      
      if (cacheAge < maxAge) {
        return cachedResponse;
      }
    }
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Limiter la taille du cache
      await limitCacheSize(cacheName, getMaxCacheSize(cacheName));
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('📱 Network failed, returning cache:', request.url);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

async function networkOnlyNavigation(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return caches.match('/') || new Response('Application indisponible hors ligne', { status: 503 });
  }
}

// Network First Strategy (pour les API)
async function networkFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    if (request.url.includes('/api/produits')) {
      return new Response(JSON.stringify({
        error: 'Hors ligne - Données en cache',
        data: await getCachedProducts(),
        cached: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);
  
  return cachedResponse || fetchPromise;
}

// Helper functions
function isStaticAsset(url) {
  const pathname = new URL(url, location.origin).pathname;
  return pathname.endsWith('.css') || 
         pathname.endsWith('.js') || 
         pathname.endsWith('.woff') || 
         pathname.endsWith('.woff2') ||
         CRITICAL_ASSETS.some(asset => pathname === asset);
}

function isImageRequest(url) {
  return url.includes('.jpg') || 
         url.includes('.jpeg') || 
         url.includes('.png') || 
         url.includes('.webp') ||
         url.includes('.gif') ||
         url.includes('/images/') ||
         url.includes('/uploads/');
}

function isAPIRequest(url) {
  return url.includes('/api/');
}

function getMaxCacheSize(cacheName) {
  if (cacheName.includes('images')) return MAX_IMAGE_CACHE_SIZE;
  if (cacheName.includes('static')) return MAX_STATIC_CACHE_SIZE;
  return MAX_DYNAMIC_CACHE_SIZE;
}

// Limiter la taille du cache
async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxSize) {
    // Supprimer les plus anciens
    const keysToDelete = keys.slice(0, keys.length - maxSize);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
    console.log(`🗑️ Cache size limited for ${cacheName}: deleted ${keysToDelete.length} entries`);
  }
}

// Background Sync pour mobile
self.addEventListener('sync', (event) => {
  console.log('🔄 Mobile background sync:', event.tag);
  
  if (event.tag === 'sync-mobile-data') {
    event.waitUntil(syncMobileData());
  }
});

async function syncMobileData() {
  try {
    // Synchroniser les données optimisées pour mobile
    const response = await fetch('/api/mobile/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lastSync: localStorage.getItem('lastMobileSync'),
        deviceType: 'mobile'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('lastMobileSync', Date.now().toString());
      
      // Mettre à jour le cache avec les nouvelles données
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put('/api/mobile/data', new Response(JSON.stringify(data)));
      
      console.log('✅ Mobile data synced successfully');
    }
  } catch (error) {
    console.error('❌ Mobile sync error:', error);
  }
}

// Optimisation de la mémoire
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data === 'cleanup') {
    // Nettoyer les anciens caches
    cleanupOldCaches();
  }
});

async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE];
  
  await Promise.all(
    cacheNames
      .filter(name => !currentCaches.includes(name))
      .map(name => caches.delete(name))
  );
  
  console.log('🧹 Cache cleanup completed');
}
