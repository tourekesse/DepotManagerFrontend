// src/api/invitationApi.js
import { privateApi } from './axios';
import { sendSMS } from './smsApi';

/**
 * Envoie une invitation d'installation de l'application à un nouveau client
 * Utilise plusieurs méthodes pour éviter le blacklist WhatsApp
 * @param {Object} params
 * @param {string} params.clientPhone - Numéro de téléphone du client
 * @param {string} params.clientName - Nom du client
 * @param {string} params.depotName - Nom du dépôt/bar
 * @param {string} params.gerantName - Nom du gérant
 * @param {string} params.invitationType - Type d'invitation: 'whatsapp', 'sms', 'email', 'push'
 * @returns {Promise}
 */
export function sendAppInvitation(params) {
  switch (params.invitationType) {
    case 'whatsapp':
      return sendWhatsAppInvitation(params);
    case 'sms':
      return sendSMSInvitation(params);
    case 'email':
      return sendEmailInvitation(params);
    case 'push':
      return sendPushInvitation(params);
    default:
      return sendWhatsAppInvitation(params); // Default fallback
  }
}

/**
 * Méthode WhatsApp (avec protection anti-blacklist)
 */
function sendWhatsAppInvitation(params) {
  const message = buildInvitationMessage(params);
  
  return privateApi.post('/api/whatsapp/send-message', {
    phoneNumber: params.clientPhone,
    message: message,
    // Ajout de métadonnées pour suivi
    metadata: {
      type: 'invitation',
      source: 'depot_manager',
      priority: 'low' // Pour éviter le blacklist
    }
  });
}

/**
 * Méthode SMS (simulation pour tests)
 */
function sendSMSInvitation(params) {
  const message = buildSMSInvitationMessage(params);
  
  // Utilise la simulation SMS pour tester
  return sendSMS({
    phoneNumber: params.clientPhone,
    message: message
  });
}

/**
 * Méthode Email (pour les clients avec email)
 */
function sendEmailInvitation(params) {
  return privateApi.post('/api/email/send-invitation', {
    to: params.clientEmail,
    subject: `Invitation à installer DepotManager - ${params.depotName}`,
    template: 'app-invitation',
    data: params
  });
}

/**
 * Méthode Push Notification (si client déjà inscrit)
 */
function sendPushInvitation(params) {
  return privateApi.post('/api/notifications/send-push', {
    token: params.pushToken,
    title: '📱 Invitation DepotManager',
    body: `${params.gerantName} vous invite à installer l'application mobile !`,
    data: {
      type: 'app_invitation',
      depotName: params.depotName
    }
  });
}

/**
 * Construit le message d'invitation WhatsApp personnalisé
 */
function buildInvitationMessage(params) {
  const { clientName, depotName, gerantName } = params;
  
  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 *DepotManager*
Votre partenaire commandes & livraisons.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👋 *Bonjour ${clientName},*

Vous avez été invité(e) par *${gerantName}* du dépôt *${depotName}* à installer l'application mobile DepotManager.

📱 *TÉLÉCHARGEZ L'APPLICATION :*
• Play Store: [Lien vers Play Store]
• App Store: [Lien vers App Store]

✨ *AVANTAGES :*
• Commandez facilement depuis votre mobile
• Suivez vos livraisons en temps réel
• Gérez votre historique de commandes
• Recevez des notifications instantanées

🔑 *CRÉATION DE COMPTE :*
1. Installez l'application
2. Utilisez votre numéro: ${params.clientPhone}
3. Choisissez votre mot de passe

📞 Support: +225 07 08 40 40 50

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

/**
 * Construit le message SMS optimisé pour la Côte d'Ivoire
 */
function buildSMSInvitationMessage(params) {
  const { clientName, depotName, gerantName } = params;
  
  return `${depotName} vous invite sur DepotManager! 
${gerantName} vous recommande l'app pour commander facilement.
Téléchargez: [lien-app]
Tel: ${params.clientPhone}
Support: 07 08 40 40 50`;
}

/**
 * Récupère la liste des notifications WhatsApp envoyées (utilise la table Notification existante)
 * @param {Object} params
 * @param {number} params.depotId - ID du dépôt
 * @param {string} params.status - Filtre par statut: 'true' (succès), 'false' (échec)
 * @param {string} params.dateFrom - Date de début (format YYYY-MM-DD)
 * @param {string} params.dateTo - Date de fin (format YYYY-MM-DD)
 * @returns {Promise}
 */
export function getInvitationsList(params) {
  return privateApi.get('/api/notifications/list', {
    params
  });
}

/**
 * Crée un nouveau client et envoie automatiquement une invitation
 * @param {Object} clientData
 * @param {string} clientData.name - Nom du client
 * @param {string} clientData.phone - Numéro de téléphone
 * @param {string} clientData.address - Adresse (optionnel)
 * @param {Object} invitationData
 * @param {string} invitationData.type - Type d'invitation: 'whatsapp' ou 'sms'
 * @param {boolean} invitationData.sendImmediately - Envoyer immédiatement
 * @param {string} invitationData.depotName - Nom du dépôt
 * @param {string} invitationData.gerantName - Nom du gérant
 * @returns {Promise}
 */
export function createClientWithInvitation(clientData, invitationData) {
  // Version simulation - crée le client et envoie le SMS simulé
  console.log('👤 CRÉATION CLIENT SIMULATION:', clientData);
  
  // Simuler la création du client dans la base
  const simulatedClient = {
    id: `CLIENT_${Date.now()}`,
    name: clientData.name,
    phone: clientData.phone,
    address: clientData.address,
    password: "123456", // Mot de passe par défaut pour tests
    createdAt: new Date().toISOString()
  };
  
  console.log('✅ Client créé (simulation):', simulatedClient);
  
  // Envoyer l'invitation SMS
  if (invitationData.sendImmediately) {
    return sendSMSInvitation({
      clientPhone: clientData.phone,
      clientName: clientData.name,
      depotName: invitationData.depotName,
      gerantName: invitationData.gerantName,
      invitationType: invitationData.type
    }).then(smsResult => {
      return {
        data: {
          client: simulatedClient,
          invitation: smsResult.data,
          message: `Client ${clientData.name} créé et SMS envoyé avec succès!`
        }
      };
    });
  }
  
  return Promise.resolve({
    data: {
      client: simulatedClient,
      message: `Client ${clientData.name} créé avec succès!`
    }
  });
  
  // Version réelle (à décommenter quand vous aurez l'API)
  /*
  return privateApi.post('/api/clients/create-with-invitation', {
    client: clientData,
    invitation: invitationData
  });
  */
}

/**
 * Récupère les détails d'une notification spécifique
 * @param {string} notificationId - ID de la notification
 * @returns {Promise}
 */
export function checkInvitationStatus(notificationId) {
  return privateApi.get(`/api/notifications/${notificationId}`);
}

/**
 * Supprime une notification (fonction de nettoyage)
 * @param {string} notificationId - ID de la notification
 * @returns {Promise}
 */
export function cancelInvitation(notificationId) {
  return privateApi.delete(`/api/notifications/${notificationId}`);
}

/**
 * Renvoie une invitation (recrée une notification pour le même numéro)
 * @param {string} notificationId - ID de la notification originale
 * @param {Object} params - Paramètres pour le nouvel envoi
 * @returns {Promise}
 */
export function resendInvitation(notificationId, params) {
  return privateApi.post(`/api/notifications/${notificationId}/resend`, params);
}
