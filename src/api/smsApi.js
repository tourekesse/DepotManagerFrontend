// src/api/smsApi.js
import { privateApi } from './axios';

/**
 * Envoie un SMS (version simulation pour tests)
 * @param {Object} params
 * @param {string} params.phoneNumber - Numéro de téléphone
 * @param {string} params.message - Message à envoyer
 * @returns {Promise}
 */
export function sendSMS(params) {
  // Version simulation - retourne toujours succès
  console.log('📱 SIMULATION SMS:', {
    to: params.phoneNumber,
    message: params.message,
    timestamp: new Date().toISOString()
  });
  
  return Promise.resolve({
    data: {
      success: true,
      messageId: `SIM_${Date.now()}`,
      status: 'sent',
      message: 'SMS simulé envoyé avec succès'
    }
  });
  
  // Version réelle (à décommenter quand vous aurez l'API SMS)
  /*
  return privateApi.post('/api/sms/send', {
    phoneNumber: params.phoneNumber,
    message: params.message
  });
  */
}

/**
 * Vérifie le statut d'un SMS envoyé
 */
export function checkSMSStatus(messageId) {
  return Promise.resolve({
    data: {
      messageId: messageId,
      status: 'delivered',
      deliveredAt: new Date().toISOString()
    }
  });
}
