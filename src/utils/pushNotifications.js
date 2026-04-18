// 📱 Push Notifications Service avec Firebase
import { getFirebaseToken, onFirebaseMessage } from './firebase';

class PushNotificationService {
  
  // Demander la permission et obtenir le token Firebase
  async requestPermissionAndGetToken() {
    if (!('Notification' in window)) {
      console.log('❌ Notifications non supportées');
      return false;
    }
    
    const token = await getFirebaseToken();
    if (token) {
      console.log('✅ Token Firebase obtenu:', token);
      return token;
    }
    
    return false;
  }
  
  // Envoyer le token au serveur
  async sendTokenToServer(token, clientId) {
    try {
      const response = await fetch(`/api/validation/clients/${clientId}/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: token
      });
      
      if (response.ok) {
        console.log('✅ Token Firebase envoyé au serveur');
        return true;
      }
    } catch (error) {
      console.error('❌ Erreur envoi token:', error);
    }
    return false;
  }
  
  // Initialiser le service
  async initialize(clientId) {
    console.log('🚀 Initialisation push notifications Firebase...');
    
    // 1. Obtenir le token Firebase
    const token = await this.requestPermissionAndGetToken();
    if (!token) {
      return false;
    }
    
    // 2. Envoyer au serveur
    const sent = await this.sendTokenToServer(token, clientId);
    
    // 3. Écouter les messages
    onFirebaseMessage((payload) => {
      console.log('📱 Message Firebase reçu:', payload);
      
      // Afficher notification
      if (payload.notification && Notification.permission === 'granted') {
        try {
          new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: '/vite.svg',
            tag: payload.data?.venteId || 'default',
            requireInteraction: true,
            actions: [
              { action: 'confirm', title: '✅ CONFIRMER' },
              { action: 'refuse', title: '❌ REFUSER' },
              { action: 'problem', title: '🚨 PROBLÈME' }
            ]
          });
        } catch (error) {
          console.warn('⚠️ Erreur création notification:', error);
        }
      }
    });
    
    console.log('📱 Push notifications Firebase initialisées:', sent);
    return sent;
  }
  
  // Afficher une notification de test
  showTestNotification() {
    if (Notification.permission === 'granted') {
      new Notification('📦 DepotManager Test', {
        body: 'Les notifications Firebase sont actives !',
        icon: '/vite.svg',
        tag: 'test-notification'
      });
    }
  }
  
  // Envoyer une notification au gérant pour une nouvelle commande
  async notifyGerantNouvelleCommande(commandeData) {
    try {
      const response = await fetch('/api/notifications/gerant/nouvelle-commande', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: '🛒 NOUVELLE COMMANDE CLIENT',
          body: `Commande #${commandeData.commandeId} de ${commandeData.clientNom || 'Client'}\n📦 ${commandeData.nombreProduits} produit(s)\n💰 Total: ${commandeData.total} F\n🚚 ${commandeData.modeRetrait}`,
          data: {
            type: 'NOUVELLE_COMMANDE',
            commandeId: commandeData.commandeId,
            clientId: commandeData.clientId,
            modeRetrait: commandeData.modeRetrait,
            total: commandeData.total
          }
        })
      });
      
      if (response.ok) {
        console.log('✅ Notification envoyée au gérant');
        return true;
      } else {
        console.error('❌ Erreur envoi notification gérant:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur notification gérant:', error);
      return false;
    }
  }
}

export default new PushNotificationService();
