// src/api/validationApi.js
import { privateApi } from './axios';

/**
 * Envoie une demande de confirmation de livraison au client (push ou WhatsApp)
 * @param {Object} params
 * @returns {Promise<{token: string}>}
 */
export function sendDeliveryValidationRequest(params) {
  // params doit contenir : venteId, clientId, canal, etc.
  return privateApi.post('/api/validation/demande', params);
}

/**
 * Vérifie le statut de la validation (polling)
 * @param {string} token
 * @returns {Promise<{status: 'pending'|'accepted'|'refused', ...}>}
 */
export function getDeliveryValidationStatus(token) {
  return privateApi.get(`/api/validation/status/${token}`);
}
