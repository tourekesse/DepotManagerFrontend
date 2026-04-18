import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Alert } from '@mui/material';
import { privateApi } from '../../../api/axios';
import { getActivePointDeVenteId } from '../../../utils/pdv';
import { useNavigate } from 'react-router-dom';

export default function CaisseOuverture() {
  const navigate = useNavigate();
  const [depotInitial, setDepotInitial] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!redirecting) return;

    const timeout = setTimeout(() => {
      navigate('/accueil/caisse/journal');
    }, 1500);

    return () => clearTimeout(timeout);
  }, [redirecting, navigate]);

  const handleOuvrir = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const pvId = getActivePointDeVenteId(); // Utiliser le PV ID du user connecté
      if (!pvId) {
        setError('Aucun point de vente actif trouvé');
        return;
      }
      
      const params = new URLSearchParams({ pvId });
      
      if (depotInitial && parseFloat(depotInitial) > 0) {
        params.append('depotInitial', depotInitial);
      }

      const response = await privateApi.post(`/api/caisse/ouverture?${params.toString()}`);
      
      setMessage(`Caisse ouverte avec succès. Solde initial: ${response.data.soldeFinal || 0} FCFA`);
      setDepotInitial('');
      setRedirecting(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'ouverture de la caisse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Ouverture de Caisse
          </Typography>

          {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            fullWidth
            label="Dépôt initial (optionnel)"
            type="number"
            value={depotInitial}
            onChange={(e) => setDepotInitial(e.target.value)}
            sx={{ mb: 3 }}
            helperText="Laissez vide pour utiliser le solde de la veille"
          />

          <Button
            fullWidth
            variant="contained"
            onClick={handleOuvrir}
            disabled={loading}
          >
            {loading ? 'Ouverture...' : 'Ouvrir la Caisse'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
