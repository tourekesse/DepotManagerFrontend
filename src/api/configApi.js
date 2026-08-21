import { privateApi } from './axios';

const CONFIG_BASE = '/api/config';
const TARIF_BASE = '/api/config/tarifs';

export const countryConfigApi = {
  getAll: () => privateApi.get(`${CONFIG_BASE}/countries/all`),
  getActive: () => privateApi.get(`${CONFIG_BASE}/countries`),
  getByCode: (code) => privateApi.get(`${CONFIG_BASE}/countries/${code}`),
  create: (data) => privateApi.post(`${CONFIG_BASE}/countries`, data),
  update: (id, data) => privateApi.put(`${CONFIG_BASE}/countries/${id}`, data),
  delete: (id) => privateApi.delete(`${CONFIG_BASE}/countries/${id}`),
};

export const tarifApi = {
  getAll: () => privateApi.get(TARIF_BASE),
  getActifs: () => privateApi.get(`${TARIF_BASE}/actifs`),
  getById: (id) => privateApi.get(`${TARIF_BASE}/${id}`),
  getByPays: (pays) => privateApi.get(`${TARIF_BASE}/pays/${pays}`),
  create: (data) => privateApi.post(TARIF_BASE, data),
  update: (id, data) => privateApi.put(`${TARIF_BASE}/${id}`, data),
  delete: (id) => privateApi.delete(`${TARIF_BASE}/${id}`),
};
