import axios from 'axios';
import { getActivePointDeVenteId } from '../utils/pdv';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080/api';

/**
 * Récupère toutes les ventes d'un point de vente spécifique
 */
export const fetchVentesByPointDeVente = async (pointDeVenteId) => {
    try {
        const pvId = pointDeVenteId ?? getActivePointDeVenteId();
        if (!pvId) throw new Error('Point de vente introuvable');
        const response = await axios.get(`${API_URL}/ventes/point-de-vente/${pvId}`);
        return response.data;
    } catch (error) {
        console.error("Erreur API fetchVentes :", error);
        throw error;
    }
};

/**
 * Supprime une vente
 */
export const deleteVente = async (venteId) => {
    try {
        await axios.delete(`${API_URL}/ventes/${venteId}`);
    } catch (error) {
        throw error;
    }
};