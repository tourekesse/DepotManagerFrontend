// 🔥 Firebase Configuration
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyBjycsXSf68phnC9NpH968cvh633cACSJk",
  authDomain: "depotmanager-51482.firebaseapp.com",
  projectId: "depotmanager-51482",
  storageBucket: "depotmanager-51482.firebasestorage.app",
  messagingSenderId: "516353481225",
  appId: "1:516353481225:web:741c9a63603eb761e236d8",
  measurementId: "G-2EYWRZXRT3"
};

// Vérifier si Service Workers sont supportés (nécessaire pour Firebase Messaging)
const isServiceWorkerSupported = 'serviceWorker' in navigator;

// Initialiser Firebase seulement si pas déjà initialisé
let app;
let messaging = null;

if (!getApps().length) {
  console.log('🔥 Initialisation Firebase...');
  app = initializeApp(firebaseConfig);
  
  // Messaging uniquement si Service Workers supportés
  if (isServiceWorkerSupported) {
    try {
      messaging = getMessaging(app);
      console.log('🔔 Firebase Messaging initialisé');
    } catch (error) {
      console.warn('⚠️ Firebase Messaging non disponible:', error.message);
    }
  } else {
    console.warn('⚠️ Service Workers non supportés - Notifications désactivées');
  }
} else {
  console.log('🔥 Firebase déjà initialisé');
  // Reuse existing app instance
  app = getApp();
  if (isServiceWorkerSupported) {
    try {
      messaging = getMessaging(app);
    } catch (e) {
      console.warn('⚠️ Messaging erreur:', e.message);
    }
  }
}

// Obtenir le push token
export async function getFirebaseToken() {
  // Vérifier si messaging est disponible
  if (!messaging) {
    console.warn('⚠️ Firebase Messaging non initialisé');
    return null;
  }
  
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('❌ Permission notifications refusée');
      return null;
    }

    // Clé Web Push de Firebase
    const token = await getToken(messaging, {
      vapidKey: 'BJEB7F2gGSx80pIc6HKpuKJoLd-6TvI-aN4ha-JqAVc11O232aNikxl3Jpy2VMnTikVc1AWAS-zCxUDzJPBVlR0'
    });

    console.log('🔑 Firebase token:', token);
    return token;
  } catch (error) {
    console.error('❌ Erreur token Firebase:', error);
    return null;
  }
}

// Écouter les messages
export function onFirebaseMessage(callback) {
  if (!messaging) {
    console.warn('⚠️ Firebase Messaging non initialisé - onMessage désactivé');
    return () => {}; // Retourner une fonction de cleanup vide
  }
  
  return onMessage(messaging, (payload) => {
    console.log('📱 Message reçu:', payload);
    
    // Afficher la notification même en foreground
    if (payload.notification && 'Notification' in window) {
      new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: '/icons/icon-192.png',
        data: payload.data
      });
    }
    
    callback(payload);
  });
}

export { messaging, app, getToken, onMessage };
