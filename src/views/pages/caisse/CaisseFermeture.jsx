import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Alert, AlertTitle, MenuItem } from '@mui/material';
import { privateApi } from '../../../api/axios';
import useActivePointDeVenteId from '../../../hooks/useActivePointDeVenteId';
import { useNavigate } from 'react-router-dom';

export default function CaisseFermeture() {
  const navigate = useNavigate();
  const pvId = useActivePointDeVenteId();
  const [montantPhysique, setMontantPhysique] = useState('');
  const [soldeTheorique, setSoldeTheorique] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [redirecting, setRedirecting] = useState(false);
  const [statut, setStatut] = useState(null);
  const [motif, setMotif] = useState('');

  const motifOptions = [
    { value: 'ESPAGNE', label: 'Espagne encaissé' },
    { value: 'RECU', label: 'Reçu non enregistré' },
    { value: 'DEPENSE', label: 'Dépense non enregistrée' },
    { value: 'ERREUR', label: 'Erreur de rendu' },
    { value: 'AUTRE', label: 'Autre' },
  ];

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      if (!pvId) return;
      
      try {
        const response = await privateApi.get(`/api/caisse/statut?pvId=${pvId}`);
        if (!mounted) return;
        setStatut(response.data);

        if (response.data.ouverte) {
          const caisse = await privateApi.get(`/api/caisse/aujourd-hui?pvId=${pvId}`);
          if (mounted && caisse.data) {
            setSoldeTheorique(caisse.data.soldeFinal || 0);
            setMontantPhysique((caisse.data.soldeFinal || 0).toString());
          }
        }
      } catch (err) {
        setStatut({ ouverte: false });
      }
    };
    
    fetchData();
    return () => { mounted = false; };
  }, [pvId]);

  useEffect(() => {
    if (!redirecting) return;
    const timeout = setTimeout(() => navigate('/accueil/caisse/journal'), 2000);
    return () => clearTimeout(timeout);
  }, [redirecting, navigate]);

  const calcEcart = () => {
    if (!soldeTheorique || !montantPhysique) return null;
    const physique = parseFloat(montantPhysique);
    if (isNaN(physique)) return null;
    return physique - parseFloat(soldeTheorique);
  };

  const ecart = calcEcart();
  const showMotif = ecart !== null && ecart !== 0;

  const getEcartsDisplay = () => {
    if (ecart === null) return null;
    if (ecart === 0) {
      return <Alert severity="success" sx={{ mb: 2 }}>Parfait ! Solde theorique = Solde physique ({soldeTheorique} FCA)</Alert>;
    } else if (ecart > 0) {
      return <Alert severity="warning" sx={{ mb: 2 }}><AlertTitle>Ecart positif +{ecart} FCA</AlertTitle>Le montant physique est superieur au solde theorique ({soldeTheorique} FCA)</Alert>;
    } else {
      return <Alert severity="error" sx={{ mb: 2 }}><AlertTitle>Ecart negatif {ecart} FCA</AlertTitle>Le montant physique est inferieur au solde theorique ({soldeTheorique} FCA)</Alert>;
    }
  };

  const handleFermer = async () => {
    if (!montantPhysique || parseFloat(montantPhysique) < 0) {
      setError('Veuillez saisir un montant valide');
      return;
    }

    if (showMotif && !motif) {
      setError('Veuillez justifiez lecart');
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const params = new URLSearchParams({ pvId, montantPhysique });
      if (motif) {
        params.append('motif', motif);
      }
      const response = await privateApi.post(`/api/caisse/fermeture?${params.toString()}`);
      
      const ecartFinal = response.data.soldeFinal - parseFloat(montantPhysique);
      const motifMsg = motif ? " - Motif: " + motif : "";
      if (ecartFinal === 0) {
        setMessage("Caisse fermee ! Solde theorique = Solde physique (" + response.data.soldeFinal + " FCA)");
      } else {
        setMessage("Caisse fermee avec ecart: " + (ecartFinal > 0 ? "+" : "") + ecartFinal + " FCA - Motif: " + motif);
      }
      setStatut({ ouverte: false });
      setRedirecting(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la fermeture');
    } finally {
      setLoading(false);
    }
  };

  if (statut === null) {
    return <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}><Card><CardContent><Typography>Chargement...</Typography></CardContent></Card></Box>;
  }

  if (!statut.ouverte) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Card>
          <CardContent>
            <Alert severity="info" sx={{ mb: 2 }}>{statut?.fermee ? 'La caisse est deja fermee.' : 'La caisse nest pas ouverte.'}</Alert>
            <Button fullWidth variant="contained" onClick={() => navigate('/accueil/caisse/journal')}>Voir le journal</Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>Fermeture de caisse</Typography>

          {soldeTheorique && <Alert severity="info" sx={{ mb: 2 }}>Solde theorique: <strong>{soldeTheorique} FCA</strong></Alert>}
          {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {getEcartsDisplay()}

          <TextField fullWidth label="Montant reel" type="number" value={montantPhysique} onChange={(e) => setMontantPhysique(e.target.value)} sx={{ mb: 3 }} helperText="Montant reel en caisse" />

          {showMotif && (
            <TextField fullWidth select label="Motif de lecart" value={motif} onChange={(e) => setMotif(e.target.value)} sx={{ mb: 3 }}>
              {motifOptions.map((opt) => (<MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>))}
            </TextField>
          )}

          <Button fullWidth variant="contained" color="error" onClick={handleFermer} disabled={loading}>{loading ? 'Fermeture...' : 'Fermer la caisse'}</Button>
        </CardContent>
      </Card>
    </Box>
  );
}