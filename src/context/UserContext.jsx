import { createContext, useState, useEffect, useContext } from 'react';
import { messaging, getToken as getFirebaseToken } from '../utils/firebase.js';
import { privateApi } from '../api/axios';

const UserContext = createContext();

// Générer un session ID unique pour cette fenêtre
const generateSessionId = () => {
  return 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // État pour stocker le point de vente sur lequel l'utilisateur travaille
  const [activePointDeVente, setActivePointDeVente] = useState(null);
  // Identifiant de session unique pour cette fenêtre
  const [sessionId] = useState(() => {
    const stored = localStorage.getItem("sessionId");
    return stored || generateSessionId();
  });

  // 1. Restaurer la session au chargement de l'application
  useEffect(() => {
    const storedUser = localStorage.getItem("dmUser");
    const storedPV = localStorage.getItem("activePV");
    
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      setIsAuthenticated(true);
      
      // Si activePV absent, on le dérive depuis le dmUser
      if (!storedPV) {
        const derivedPV = deriveActivePV(userData);
        if (derivedPV) {
          setActivePointDeVente(derivedPV);
          localStorage.setItem("activePV", JSON.stringify(derivedPV));
        }
      }
    }
    
    if (storedPV) {
      setActivePointDeVente(JSON.parse(storedPV));
    }
  }, []);

  // Helper : dériver le point de vente actif depuis les données utilisateur
  const deriveActivePV = (userData) => {
    if (!userData) return null;
    const id = userData.defaultPointDeVenteId || userData.default_point_de_vente_id;
    const pvs = userData.pointsDeVente || userData.points_de_vente;
    if (id && pvs) {
      const found = pvs.find(pv => pv.id === id);
      if (found) return found;
    }
    if (pvs && pvs.length > 0) return pvs[0];
    return null;
  };

  // 2. Fonction de Login améliorée
  const login = async (userData) => {
    // Stockage de l'utilisateur complet (Token, Nom, etc.)
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem("dmUser", JSON.stringify(userData));

    // RECONNAISSANCE DU POINT DE VENTE ACTIF
    // Priorité: defaultPointDeVenteId > localStorage si valide > premier de la liste
    let selectedPV = null;

    if (userData.pointsDeVente && userData.defaultPointDeVenteId) {
      selectedPV = userData.pointsDeVente.find(
        (pv) => pv.id === userData.defaultPointDeVenteId
      );
    }

    if (!selectedPV) {
      // Vérifier localStorage si valide
      const storedPV = localStorage.getItem("activePV");
      if (storedPV) {
        try {
          const parsedPV = JSON.parse(storedPV);
          if (userData.pointsDeVente && userData.pointsDeVente.some(pv => pv.id === parsedPV.id)) {
            selectedPV = parsedPV;
          }
        } catch (e) {
          // Ignore invalid JSON
        }
      }
    }

    if (!selectedPV && userData.pointsDeVente && userData.pointsDeVente.length > 0) {
      // Sinon, prendre le premier
      selectedPV = userData.pointsDeVente[0];
    }

    if (selectedPV) {
      setActivePointDeVente(selectedPV);
      localStorage.setItem("activePV", JSON.stringify(selectedPV));
      console.log("Système : Point de vente '" + selectedPV.nom + "' activé.");
    } else {
      setActivePointDeVente(null);
      localStorage.removeItem("activePV");
    }

    // Enregistrement du pushToken Firebase
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Remplace 'VOTRE_VAPID_KEY' ci-dessous par ta vraie clé (commence par BJ...)
        const vapidKey = 'BJEB7F2gGSx80pIc6HKpuKJoLd-6TvI-aN4ha-JqAVc11O232aNikxl3Jpy2VMnTikVc1AWAS-zCxUDzJPBVlR0';
        const pushToken = await getFirebaseToken(messaging, { vapidKey });
        if (pushToken) {
          await privateApi.post('/api/utilisateur/push-token', { pushToken });
          console.log('PushToken enregistré côté backend:', pushToken);
        }
      }
    } catch (err) {
      console.warn('Impossible d’enregistrer le pushToken:', err);
    }
  };

  // 3. Fonction pour changer manuellement de point de vente (si besoin)
  const selectPointDeVente = (pvData) => {
    setActivePointDeVente(pvData);
    localStorage.setItem("activePV", JSON.stringify(pvData));
  };

  // Sauvegarder le sessionId
  useEffect(() => {
    localStorage.setItem("sessionId", sessionId);
  }, [sessionId]);

  // 4. Déconnexion
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setActivePointDeVente(null);
    localStorage.removeItem("dmUser");
    localStorage.removeItem("activePV");
    localStorage.removeItem("sessionId");
  };

  // Fonction helper pour obtenir le nom d'affichage
  const getDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    return user?.phone || user?.email || "Utilisateur";
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      isAuthenticated, 
      activePointDeVente, // Très important pour tes formulaires
      sessionId,
      login, 
      logout,
      selectPointDeVente,
      setUser,
      getDisplayName
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

export default UserContext;