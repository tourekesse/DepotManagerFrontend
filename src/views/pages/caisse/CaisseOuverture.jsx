import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Alert } from '@mui/material';
import { privateApi } from '../../../api/axios';
import { getActivePointDeVenteId } from '../../../utils/pdv';
import { useNavigate, useLocation } from 'react-router-dom';

export default function CaisseOuverture() {
  const navigate = useNavigate();
  const location = useLocation();
  const [soldeOuverture, setSoldeOuverture] = useState('0');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [redirecting, setRedirecting] = useState(false);
  const [dejaOuverte, setDejaOuverte] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      const pvId = getActivePointDeVenteId();
      if (!pvId) return;
      
      try {
        const response = await privateApi.get(`/api/caisse/statut?pvId=${pvId}`);
        if (!mounted) return;
        
        const { ouverte } = response.data;
        setDejaOuverte(ouverte);
        
        if (!ouverte) {
          const lastResponse = await privateApi.get(`/api/caisse/dernier-solde?pvId=${pvId}`);
          const dernierSolde = lastResponse.data.solde;
          if (dernierSolde && parseFloat(dernierSolde) > 0) {
            setSoldeOuverture(dernierSolde.toString());
          }
        }
      } catch (err) {
        setDejaOuverte(false);
      }
    };
    
    fetchData();
    
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!redirecting) return;

    const timeout = setTimeout(() => {
      const returnUrl = location.state?.returnUrl;
      const commandeId = location.state?.commandeId;
      navigate(returnUrl || '/accueil/caisse/journal', commandeId ? { state: { commandeId } } : undefined);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [redirecting, navigate, location.state]);

  const handleOuvrir = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const pvId = getActivePointDeVenteId();
      if (!pvId) {
        setError('Aucun point de vente actif trouvé');
        return;
      }
      
      const params = new URLSearchParams({ pvId });
      const depotValue = parseFloat(soldeOuverture);
      if (isNaN(depotValue) || depotValue < 0) {
        setError('Veuillez compter le tiroir et saisir un montant valide.');
        setLoading(false);
        return;
      }
      params.append('depotInitial', depotValue.toString());

      const response = await privateApi.post(`/api/caisse/ouverture?${params.toString()}`);
      
      setMessage(`Caisse ouverte avec succès. Solde initial: ${response.data.soldeFinal || 0} FCA`);
      setSoldeOuverture('0');
      setDejaOuverte(true);
      setRedirecting(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de l\'ouverture de la caisse';
      if (msg.includes('déjà ouverte')) {
        setDejaOuverte(true);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (dejaOuverte === null) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Card>
          <CardContent>
            <Typography>Chargement...</Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (dejaOuverte) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Card>
          <CardContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              La caisse est déjà ouverte aujourd'hui.
            </Alert>
            <Button
              fullWidth
              variant="contained"
              onClick={() => navigate('/accueil/caisse/journal')}
            >
              Voir le journal
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Ouverture de Caisse
          </Typography>

          {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Alert severity="info" sx={{ mb: 2 }}>
            Comptez physiquement le tiroir et validez le montant ci-dessous. Cette action engage votre responsabilité pour le fond de caisse.
          </Alert>

          <TextField
            fullWidth
            label="Montant compté dans le tiroir (FCA)"
            type="number"
            value={soldeOuverture}
            onChange={(e) => setSoldeOuverture(e.target.value)}
            sx={{ mb: 3 }}
            helperText="Le solde de la fermeture précédente est proposé par défaut. Vérifiez-le et corrigez si besoin."
          />

          <Button
            fullWidth
            variant="contained"
            onClick={handleOuvrir}
            disabled={loading}
          >
            {loading ? 'Ouverture...' : 'Valider l\'ouverture'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}