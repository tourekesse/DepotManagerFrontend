// Service Worker avancé pour PWA
// public/sw.js

const CACHE_NAME = 'depotmanager-v1.0.0';
const STATIC_CACHE = 'depotmanager-static-v1.0.0';
const DYNAMIC_CACHE = 'depotmanager-dynamic-v1.0.0';

// URLs à mettre en cache pour le mode hors ligne
const STATIC_ASSETS = [
  '/',
  '/accueil/ventes/nouveau',
  '/dashboard',
  '/manifest.json',
  '/logos/icon-pwa.svg',
  '/logos/favicon.svg',
  // CSS et JS critiques
  '/static/css/main.css',
  '/static/js/main.js'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Stratégie de cache intelligente
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Stratégie 1: Cache First pour les assets statiques
  if (STATIC_ASSETS.some(asset => url.pathname === asset)) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          return response || fetch(request);
        })
    );
    return;
  }
  
  // Stratégie 2: Network First pour les API critiques
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      networkFirstStrategy(request)
    );
    return;
  }
  
  // Stratégie 3: Stale While Revalidate pour les autres requêtes
  event.respondWith(
    staleWhileRevalidate(request)
  );
});

// Network First Strategy pour les API
async function networkFirstStrategy(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    
    // Mettre en cache les réponses API réussies
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('📱 Network failed, trying cache:', request.url);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Retourner une réponse offline pour les API critiques
    if (request.url.includes('/api/produits')) {
      return new Response(JSON.stringify({
        error: 'Hors ligne - Données en cache',
        data: await getCachedProducts()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
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

// Background Sync pour la synchronisation
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-sales') {
    event.waitUntil(syncPendingSales());
  }
  
  if (event.tag === 'sync-products') {
    event.waitUntil(syncProducts());
  }
});

// Synchroniser les ventes en attente
async function syncPendingSales() {
  const pendingSales = await getPendingSales();
  
  for (const sale of pendingSales) {
    try {
      const response = await fetch('/api/ventes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sale)
      });
      
      if (response.ok) {
        await removePendingSale(sale.id);
        console.log('✅ Sale synced successfully:', sale.id);
      }
    } catch (error) {
      console.error('❌ Failed to sync sale:', sale.id, error);
    }
  }
}

// Synchroniser les produits
async function syncProducts() {
  try {
    const response = await fetch('/api/produits');
    const products = await response.json();
    
    const cache = await caches.open(DYNAMIC_CACHE);
    await cache.put('/api/produits', new Response(JSON.stringify(products)));
    
    console.log('✅ Products synced successfully');
  } catch (error) {
    console.error('❌ Failed to sync products:', error);
  }
}

// Push Notifications
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification',
    icon: '/logos/icon-pwa.svg',
    badge: '/logos/favicon.svg',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Voir',
        icon: '/logos/favicon.svg'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: '/logos/favicon.svg'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Dépôt Manager', options)
  );
});

// Gestion des clics sur notifications
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/accueil/ventes/nouveau')
    );
  } else if (event.action === 'close') {
    // Fermer la notification
  } else {
    // Action par défaut: ouvrir l'application
    event.waitUntil(
      clients.matchAll()
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url === '/' && 'focus' in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow('/');
          }
        })
    );
  }
});

// Helper functions pour IndexedDB
async function getPendingSales() {
  return new Promise((resolve) => {
    const request = indexedDB.open('DepotManagerDB', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['pendingSales'], 'readonly');
      const store = transaction.objectStore('pendingSales');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
    };
  });
}

async function removePendingSale(saleId) {
  return new Promise((resolve) => {
    const request = indexedDB.open('DepotManagerDB', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['pendingSales'], 'readwrite');
      const store = transaction.objectStore('pendingSales');
      store.delete(saleId);
    };
  });
}

async function getCachedProducts() {
  const cache = await caches.open(DYNAMIC_CACHE);
  const response = await cache.match('/api/produits');
  return response ? await response.json() : [];
}
