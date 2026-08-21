import { privateApi } from "./axios";

export const fetchReferentielsProduits = async () => {
  const response = await privateApi.get("/api/referentiels-produits");
  return response.data;
};

export const fetchMarquesReferences = async () => {
  const response = await privateApi.get("/api/references/marques");
  return response.data;
};

export const fetchFormatsReferences = async () => {
  const response = await privateApi.get("/api/references/formats");
  return response.data;
};

export const createReferentielProduit = async (type, libelle) => {
  const endpoints = {
    marque: "/api/referentiels-produits/marques",
    format: "/api/referentiels-produits/formats",
    groupeLiquide: "/api/referentiels-produits/groupes-liquides",
  };

  if (!endpoints[type]) {
    throw new Error("Type de référentiel inconnu");
  }

  const response = await privateApi.post(endpoints[type], { libelle });
  return response.data;
};
