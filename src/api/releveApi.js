import { publicApi, privateApi } from "./axios";

/**
 * Récupère le relevé détaillé d'un client pour une période donnée
 */
export const fetchReleveDetaille = async (clientId, detail = true, mois = null) => {
  try {
    let url = `/api/clients/${clientId}/releve?detail=${detail}`;
    if (mois) {
      url += `&mois=${mois}`;
    }
    const response = await privateApi.get(url);
    return response.data;
  } catch (error) {
    console.error("Erreur récupération relevé:", error);
    throw error;
  }
};

/**
 * Récupère l'historique complet du relevé client
 */
export const fetchReleveHistorique = async (clientId, detail = true) => {
  try {
    const response = await privateApi.get(`/api/clients/${clientId}/releve/historique?detail=${detail}`);
    return response.data;
  } catch (error) {
    console.error("Erreur récupération historique:", error);
    throw error;
  }
};

/**
 * Envoie le relevé du client par WhatsApp
 */
export const envoyerReleveWhatsApp = async (clientId, detail = true, mois = null) => {
  try {
    let url = `/api/clients/${clientId}/releve/whatsapp?detail=${detail}`;
    if (mois) {
      url += `&mois=${mois}`;
    }
    const response = await privateApi.post(url);
    return response.data;
  } catch (error) {
    console.error("Erreur envoi relevé WhatsApp:", error);
    throw error;
  }
};
