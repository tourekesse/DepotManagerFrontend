import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Alert } from '@mui/material';
import { privateApi } from '../../../api/axios';
import useActivePointDeVenteId from '../../../hooks/useActivePointDeVenteId';
import { useNavigate } from 'react-router-dom';

export default function CaisseFermeture() {
  const navigate = useNavigate();
  const pvId = useActivePointDeVenteId(); // Utilise le pvId dynamique
  const [montantPhysique, setMontantPhysique] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!redirecting) return;

    const timeout = setTimeout(() => {
      navigate('/accueil/caisse/journal');
    }, 2000);

    return () => clearTimeout(timeout);
  }, [redirecting, navigate]);

  const handleFermer = async () => {
    if (!montantPhysique || parseFloat(montantPhysique) < 0) {
      setError('Veuillez saisir un montant physique valide');
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const params = new URLSearchParams({ 
        pvId,
        montantPhysique: montantPhysique
      });

      const response = await privateApi.post(`/api/caisse/fermeture?${params.toString()}`);
      
      const ecart = response.data.soldeFinal - parseFloat(montantPhysique);
      setMessage(
        `Caisse fermée avec succès. ` +
        `Solde théorique: ${response.data.soldeFinal || 0} FCFA. ` +
        `Écart: ${Math.abs(ecart)} FCFA ${ecart > 0 ? '(positif)' : ecart < 0 ? '(négatif)' : ''}`
      );
      setMontantPhysique('');
      setRedirecting(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la fermeture de la caisse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Fermeture de Caisse
          </Typography>

          {message && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {message}
              {redirecting && (
                <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                  🔄 Redirection vers le journal de caisse...
                </Typography>
              )}
            </Alert>
          )}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            fullWidth
            label="Montant physique en caisse *"
            type="number"
            value={montantPhysique}
            onChange={(e) => setMontantPhysique(e.target.value)}
            sx={{ mb: 3 }}
            required
            helperText="Comptez le cash en caisse et entrez le montant"
          />

          <Button
            fullWidth
            variant="contained"
            onClick={handleFermer}
            disabled={loading}
          >
            {loading ? 'Fermeture...' : 'Fermer la Caisse'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
