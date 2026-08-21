import { privateApi } from './axios';
import { getActivePointDeVenteId } from '../utils/pdv';

export const fetchVentesByPointDeVente = async (pointDeVenteId) => {
    try {
        const pvId = pointDeVenteId ?? getActivePointDeVenteId();
        if (!pvId) throw new Error('Point de vente introuvable');
        const response = await privateApi.get(`/api/ventes/point-de-vente/${pvId}`);
        return response.data;
    } catch (error) {
        console.error("Erreur API fetchVentes :", error);
        throw error;
    }
};

export const deleteVente = async (venteId) => {
    try {
        await privateApi.delete(`/api/ventes/${venteId}`);
    } catch (error) {
        throw error;
    }
};