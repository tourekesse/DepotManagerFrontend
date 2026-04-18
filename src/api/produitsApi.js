import { privateApi } from "./axios";
import { getActivePointDeVenteId } from "../utils/pdv";

/**
 * ============================
 * PRODUITS API
 * ============================
 * Toutes les requêtes liées aux produits passent par ici
 */

/**
 * 🔹 Récupérer tous les produits
 * Backend : GET /api/produits
 */
export const fetchProduitsByPointDeVente = async () => {
  const response = await privateApi.get("/api/produits");
  return response.data;
};

/**
 * 🔹 Récupérer UN produit par ID
 * Backend : GET /api/produits/{id}
 */
export const fetchProduitById = async (produitId) => {
  if (!produitId) {
    throw new Error("ID produit requis");
  }

  const response = await privateApi.get(`/api/produits/${produitId}`);
  return response.data;
};

/**
 * 🔹 Créer un produit
 * Backend : POST /api/produits
 */
export const createProduit = async (payload) => {
  if (!payload) {
    throw new Error("Payload produit manquant");
  }

  const finalPayload = { ...payload };
  // Injecter le PV actif si absent
  if (!finalPayload.pointDeVenteId && !finalPayload.pointDeVente) {
    const pvId = getActivePointDeVenteId();
    if (!pvId) {
      throw new Error("Point de vente introuvable pour la création du produit.");
    }
    finalPayload.pointDeVenteId = pvId;
  }

  const response = await privateApi.post("/api/produits", finalPayload);
  return response.data;
};

/**
 * 🔹 Mettre à jour un produit
 * Backend : PUT /api/produits/{id}
 */
export const updateProduit = async (produitId, payload) => {
  if (!produitId) {
    throw new Error("ID produit requis");
  }
  if (!payload) {
    throw new Error("Payload produit manquant");
  }

  const response = await privateApi.put(
    `/api/produits/${produitId}`,
    payload
  );
  return response.data;
};

/**
 * 🔹 Supprimer un produit
 * Backend : DELETE /api/produits/{id}
 */
export const deleteProduit = async (produitId) => {
  if (!produitId) {
    throw new Error("ID produit requis");
  }

  const response = await privateApi.delete(
    `/api/produits/${produitId}`
  );
  return response.data;
};
