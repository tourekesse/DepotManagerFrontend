/**
 * Configuration API - Sans hardcoding
 * Priorité: 1) Variable d'env  2) Détection auto localhost  3) DB via endpoint
 */

// Détermine la base URL selon la priorité
const getApiBaseUrl = () => {
  // 1️⃣ Priorité: Variable d'environnement Vite
  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== '/api') {
    console.log('🔧 API Config: VITE_API_URL =', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }
  
  // Si VITE_API_URL=/api, on est en mode dev avec proxy - baseURL vide
  if (import.meta.env.VITE_API_URL === '/api') {
    console.log('🔧 API Config: dev mode (proxy Vite via VITE_API_URL=/api)');
    return '';
  }
  
  // 2️⃣ Détection localhost (dev avec proxy Vite)
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1');
  
  if (isLocalhost) {
    console.log('🌍 API Config: dev mode (proxy Vite)');
    return '';  // baseURL vide, passe par le proxy Vite (/api)
  }
  
  // 3️⃣ Production: relatif, sera résolu par axios via la DB
  console.log('🌍 API Config: production (from DB)');
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

// Exports standards (top-level)
export const getBaseUrl = () => API_BASE_URL;
export const getBackendUrl = () => API_BASE_URL.replace(/\/api$/, '');
export const buildApiUrl = (endpoint) => {
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${clean}`;
};

export default { getBaseUrl, getBackendUrl, buildApiUrl };
