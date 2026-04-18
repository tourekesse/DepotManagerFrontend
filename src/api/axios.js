// src/api/axios.js
import axios from "axios";
import { getActivePointDeVenteId } from "../utils/pdv";
import { enqueue, flushQueue as flushQueueUtil } from "../utils/offline";

// Fonction pour charger dynamiquement l'URL backend depuis la table appendpoint
export async function fetchBackendUrl() {
  // Essayer d'abord via le proxy Vite
  try {
    const response = await axios.get('/api/endpoints/backend');
    const endpoint = response.data;
    if (endpoint && endpoint.url) {
      const port = endpoint.port ? `:${endpoint.port}` : '';
      return `${endpoint.url}${port}`;
    }
  } catch (error) {
    console.log('Proxy failed, trying direct call to backend');
  }
  
  // Fallback: appeler le backend directement
  try {
    const response = await axios.get('http://localhost:8085/api/endpoints/backend');
    const endpoint = response.data;
    if (endpoint && endpoint.url) {
      const port = endpoint.port ? `:${endpoint.port}` : '';
      return `${endpoint.url}${port}`;
    }
  } catch (error) {
    console.log('Direct call failed');
  }
  
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

// Création dynamique d'instances axios (sera configuré dans main.jsx)
export let publicApi = axios.create({ baseURL: "" });
export let privateApi = axios.create({ baseURL: "", withCredentials: true });

export function setBackendUrl(url) {
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
  // Ajout des intercepteurs comme avant
  privateApi.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Injecter le Point de Vente actif comme en-tête pour les APIs qui le supportent
      const isClientEndpointWithoutPV = config.url?.includes('/api/auth/client/') ||
                                       config.url?.includes('/api/dashboard/stats/client');
      
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
      if (!navigator.onLine && isWrite && isApi && !isAuthEndpoint(config.url)) {
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
  publicApi.interceptors.request.use(
    (config) => {
      try {
        const pvId = getActivePointDeVenteId();
        console.log("🔍 PV ID trouvé dans axios publicApi:", pvId);
        if (pvId) {
          config.headers["X-PV-ID"] = pvId;
          console.log("✅ Header X-PV-ID ajouté dans publicApi:", pvId);
        } else {
          console.log("❌ PV ID est null dans publicApi - header X-PV-ID non ajouté");
        }
      } catch (error) {
        console.log("❌ Erreur getActivePointDeVenteId dans publicApi:", error);
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
  privateApi.interceptors.response.use(
    (response) => response,
    (error) => {
      // Liste des endpoints où on ignore les erreurs 403 (base de données vide)
      const endpointsSilencieux = [
        "/api/marques",
        "/api/formats",
        "/api/groupes",
        "/api/groupeliquides", // ajoutez d'autres si nécessaire
      ];

      const estEndpointSilencieux = endpointsSilencieux.some((endpoint) =>
        error.config?.url?.includes(endpoint)
      );

      // Si c'est un 403 sur un endpoint silencieux, retourner un tableau vide
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
