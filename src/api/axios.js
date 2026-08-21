// src/api/axios.js
import axios from "axios";
import { getActivePointDeVenteId } from "../utils/pdv";
import { enqueue, flushQueue as flushQueueUtil } from "../utils/offline";

// Fonction pour charger dynamiquement l'URL backend
export async function fetchBackendUrl() {
  // 1️⃣ Priorité: Variable d'environnement VITE explicite (URL complète, pas /api seul)
  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== '/api') {
    console.log('🔧 VITE_API_URL définie:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }

  // 2️⃣ Découverte dynamique depuis la table app_endpoint
  // En DEV: passe par le proxy Vite. En PROD: appel direct.
  try {
    const tempAxios = axios.create({ baseURL: '' });
    const response = await tempAxios.get('/api/endpoints/backend');
    const endpoint = response.data;
    if (endpoint && endpoint.url) {
      const port = endpoint.port ? `:${endpoint.port}` : '';
      const fullUrl = `${endpoint.url}${port}`;
      console.log('🌐 URL backend depuis DB:', fullUrl);
      return fullUrl;
    }
  } catch (error) {
    console.log('⚠️ Découverte backend DB échouée:', error.message);
  }

  // 3️⃣ Fallback: proxy Vite
  return '';
}

const OFFLINE_QUEUE_KEY = "dmOfflineQueue";
const isWriteMethod = (method) =>
  ["post", "put", "patch", "delete"].includes((method || "").toLowerCase());

const isAuthEndpoint = (url = "") =>
  url.includes("/api/auth") || url.includes("/login") || url.includes("/register") || url.includes("/otp");

const flushQueue = async () => {
  await flushQueueUtil(OFFLINE_QUEUE_KEY, (payload) => {
    const { url, method, data, headers } = payload;
    return privateApi.request({ url, method, data, headers });
  });
};

// Fonction pour configurer les intercepteurs sur une instance axios
function setupInterceptors(instance, isPrivate = false) {
  instance.interceptors.request.use(
    (config) => {
      if (isPrivate) {
        const token = localStorage.getItem("token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      
      // Injecter le Point de Vente actif comme en-tête
      const isClientEndpointWithoutPV = config.url?.includes('/api/auth/client/') ||
                                       config.url?.includes('/api/dashboard/stats/client') ||
                                       config.url?.includes('/api/commandes/client/mes-commandes'); // Ignorer pour Mes commandes
      
      if (!isClientEndpointWithoutPV) {
        try {
          const pvId = getActivePointDeVenteId();
          if (pvId) {
            config.headers["X-PV-ID"] = pvId;
          }
        } catch (error) {
          console.log("❌ Erreur getActivePointDeVenteId:", error);
        }
      }

      // Offline queue pour les écritures API (hors auth)
      const isWrite = isWriteMethod(config.method);
      const isApi = config.url?.startsWith("/api/");
      if (isPrivate && !navigator.onLine && isWrite && isApi && !isAuthEndpoint(config.url)) {
        enqueue(OFFLINE_QUEUE_KEY, {
          url: config.url,
          method: config.method,
          data: config.data,
          headers: config.headers,
        });
        return Promise.resolve({
          data: { queuedOffline: true },
          status: 202,
          statusText: "Queued offline",
          headers: {},
          config,
        });
      }

      return config;
    },
    (error) => Promise.reject(error)
  );
}

// Création dynamique d'instances axios (sera configuré dans main.jsx)
export let publicApi = axios.create({ baseURL: "" });
export let privateApi = axios.create({ baseURL: "", withCredentials: true });

// Initialiser les intercepteurs sur les instances de base
setupInterceptors(publicApi, false);
setupInterceptors(privateApi, true);

export function setBackendUrl(url) {
  // En DEV avec proxy Vite, on garde baseURL vide
  // On ne change pas la configuration si url est vide (mode DEV)
  if (!url || url === '') {
    console.log('🔧 Mode DEV: garde baseURL vide (proxy Vite)');
    return;
  }
  
  console.log('🔧 Configuration backend URL:', url);
  publicApi = axios.create({
    baseURL: url,
    headers: { "Content-Type": "application/json" },
    timeout: 40000,
  });
  privateApi = axios.create({
    baseURL: url,
    headers: { "Content-Type": "application/json" },
    timeout: 40000,
    withCredentials: true,
  });
  
  // Reconfigurer les intercepteurs sur les nouvelles instances
  setupInterceptors(publicApi, false);
  setupInterceptors(privateApi, true);
  
  // Intercepteur response spécifique
  privateApi.interceptors.response.use(
    (response) => response,
    (error) => {
      const endpointsSilencieux = [
        "/api/marques",
        "/api/formats",
        "/api/groupes",
        "/api/groupeliquides",
      ];

      const estEndpointSilencieux = endpointsSilencieux.some((endpoint) =>
        error.config?.url?.includes(endpoint)
      );

      if (error.response?.status === 403 && estEndpointSilencieux) {
        return Promise.resolve({ data: [] });
      }

      return Promise.reject(error);
    }
  );

  // Synchroniser la file offline au démarrage et sur retour online
  flushQueue();
  if (typeof window !== "undefined") {
    window.addEventListener("online", () => flushQueue());
  }
}
