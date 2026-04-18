import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

/**
 * ClientAuthGuard.jsx - Wrapper pour protéger les routes client.
 * 
 * Usage:
 * <ClientAuthGuard>
 *   <ProtectedPage />
 * </ClientAuthGuard>
 * 
 * Vérifie:
 * 1. Token JWT présent dans localStorage
 * 2. ClientId et phone présents
 * 3. (Optionnel) Validation du token côté serveur
 * 
 * Si authentification manquante → redirects vers /login-client
 */
export default function ClientAuthGuard({ children }) {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    // Vérifier que le token JWT est présent
    const token = localStorage.getItem('token');
    const clientId = localStorage.getItem('clientId');
    const phone = localStorage.getItem('phone');

    if (!token || !clientId || !phone) {
      // Pas authentifié → rediriger
      navigate('/login-client', { replace: true });
      setIsAuthenticated(false);
    } else {
      // Authentifié (validation complète côté serveur via headers Authorization)
      setIsAuthenticated(true);
    }
  }, [navigate]);

  // En attente de vérification
  if (isAuthenticated === null) {
    return (
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}>
        <CircularProgress />
      </Box>
    );
  }

  // Pas authentifié
  if (!isAuthenticated) {
    return null; // Navigation en cours
  }

  // Authentifié → rendre les enfants
  return children;
}
