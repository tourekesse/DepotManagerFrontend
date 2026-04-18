// src/api/whatsappApi.js
import { privateApi } from './axios';

/**
 * Envoie une confirmation de livraison détaillée via WhatsApp
 * @param {Object} params
 * @param {string} params.phoneNumber
 * @param {string} params.clientName
 * @param {string} params.orderId
 * @param {string} params.deliveryDate
 * @param {string} params.deliveryAddress
 * @param {string} params.orderDetails
 * @param {string} params.amount
 * @param {string} params.deliveryPerson
 * @param {string} params.supportPhone
 * @returns {Promise}
 */
export function sendDeliveryConfirmation(params) {
  return privateApi.post('/api/whatsapp/send-delivery-confirmation', null, {
    params
  });
}
