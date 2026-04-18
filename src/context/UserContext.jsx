import { createContext, useState, useEffect, useContext } from 'react';
import { messaging, getToken as getFirebaseToken } from '../utils/firebase.js';
import { privateApi } from '../api/axios';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // État pour stocker le point de vente sur lequel l'utilisateur travaille
  const [activePointDeVente, setActivePointDeVente] = useState(null);

  // 1. Restaurer la session au chargement de l'application
  useEffect(() => {
    const storedUser = localStorage.getItem("dmUser");
    const storedPV = localStorage.getItem("activePV");
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
    
    if (storedPV) {
      setActivePointDeVente(JSON.parse(storedPV));
    }
  }, []);

  // 2. Fonction de Login améliorée
  const login = async (userData) => {
    // Stockage de l'utilisateur complet (Token, Nom, etc.)
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem("dmUser", JSON.stringify(userData));

    // RECONNAISSANCE DU POINT DE VENTE ACTIF
    // On utilise les données de ton log : defaultPointDeVenteId (ex: 215)
    if (userData.pointsDeVente && userData.defaultPointDeVenteId) {
      const activePV = userData.pointsDeVente.find(
        (pv) => pv.id === userData.defaultPointDeVenteId
      );
      
      if (activePV) {
        setActivePointDeVente(activePV);
        localStorage.setItem("activePV", JSON.stringify(activePV));
        console.log("Système : Point de vente '" + activePV.nom + "' activé par défaut.");
      }
    } else if (userData.pointsDeVente && userData.pointsDeVente.length > 0) {
      // Si pas de defaultId mais une liste existe, on prend le premier par défaut
      const firstPV = userData.pointsDeVente[0];
      setActivePointDeVente(firstPV);
      localStorage.setItem("activePV", JSON.stringify(firstPV));
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

  // 4. Déconnexion
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setActivePointDeVente(null);
    localStorage.removeItem("dmUser");
    localStorage.removeItem("activePV");
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      isAuthenticated, 
      activePointDeVente, // Très important pour tes formulaires
      login, 
      logout,
      selectPointDeVente,
      setUser 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

export default UserContext;