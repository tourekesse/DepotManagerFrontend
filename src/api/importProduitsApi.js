import { privateApi } from "./axios";

export const analyzeProduitsImport = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await privateApi.post("/api/import-produits/analyser", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const validateProduitsImport = async (payload) => {
  const response = await privateApi.post("/api/import-produits/valider", payload);
  return response.data;
};

export const confirmProduitsImport = async (payload) => {
  const response = await privateApi.post("/api/import-produits/confirmer", payload);
  return response.data;
};
