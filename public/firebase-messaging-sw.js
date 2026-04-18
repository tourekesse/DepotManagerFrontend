// Service Worker Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/12.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBjycsXSf68phnC9NpH968cvh633cACSJk",
  authDomain: "depotmanager-51482.firebaseapp.com",
  projectId: "depotmanager-51482",
  storageBucket: "depotmanager-51482.firebasestorage.app",
  messagingSenderId: "516353481225",
  appId: "1:516353481225:web:741c9a63603eb761e236d8",
  measurementId: "G-2EYWRZXRT3"
});

const messaging = firebase.messaging();
console.log('🔥 Firebase Service Worker chargé');

messaging.onBackgroundMessage((payload) => {
  console.log('📱 Notification reçue:', payload);
  
  const notificationTitle = payload.notification?.title || '🚚 Nouvelle livraison';
  const notificationOptions = {
    body: payload.notification?.body || 'Cliquez pour confirmer',
    icon: '/icons/icon-192.png',
    data: payload.data || {},
    requireInteraction: true,
    tag: 'validation-' + (payload.data?.commandeId || Date.now()),
    actions: [
      { action: 'accepter', title: '✅ CONFIRMER' },
      { action: 'refuser', title: '❌ REFUSER' }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Clic:', event.action);
  event.notification.close();
  
  const token = event.notification.data.token;
  if (!token) {
    console.error('❌ Pas de token');
    return;
  }
  
  if (event.action === 'accepter') {
    event.waitUntil(
      fetch('/api/validation/reponseBar/' + token + '?estAccepte=true', {
        method: 'POST'
      })
      .then(response => {
        console.log('📡 Réponse:', response.status);
        if (response.ok) {
          return self.registration.showNotification('✅ Livraison confirmée', {
            body: 'Le livreur procède à l\'encaissement',
            icon: '/icons/icon-192.png'
          });
        }
      })
      .catch(error => console.error('❌ Erreur:', error))
    );
    
  } else if (event.action === 'refuser') {
    event.waitUntil(
      fetch('/api/validation/reponseBar/' + token + '?estAccepte=false', {
        method: 'POST'
      })
      .then(response => {
        console.log('📡 Réponse:', response.status);
        if (response.ok) {
          return self.registration.showNotification('❌ Livraison refusée', {
            body: 'Un litige a été enregistré',
            icon: '/icons/icon-192.png'
          });
        }
      })
      .catch(error => console.error('❌ Erreur:', error))
    );
  }
});