import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  FormControl,
  FormLabel,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Radio,
  RadioGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { privateApi } from '../../../api/axios';
import useActivePointDeVenteId from '../../../hooks/useActivePointDeVenteId';

export default function CaisseMouvement() {
  const navigate = useNavigate();
  const pvId = useActivePointDeVenteId(); // Utilise le pvId dynamique
  const [types, setTypes] = useState([]);
  const [typeOperationId, setTypeOperationId] = useState('');
  const [montant, setMontant] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [caisseOuverte, setCaisseOuverte] = useState(null);
  
  // États pour la création de nouveau type
  const [openDialog, setOpenDialog] = useState(false);
  const [nouveauType, setNouveauType] = useState({ libelle: '', sens: 'SORTIE' });

  useEffect(() => {
    verifierCaisseEtChargerTypes();
  }, []);

  const verifierCaisseEtChargerTypes = async () => {
    try {
      const responseStatut = await privateApi.get(`/api/caisse/statut?pvId=${pvId}`);
      setCaisseOuverte(responseStatut.data);
      
      if (responseStatut.data) {
        chargerTypes();
      } else {
        setLoadingTypes(false);
      }
    } catch (err) {
      console.error('Erreur vérification caisse:', err);
      setError('Erreur lors de la vérification de l\'état de la caisse');
      setLoadingTypes(false);
    }
  };

  const chargerTypes = async () => {
    setLoadingTypes(true);
    try {
      const response = await privateApi.get('/api/type-operations');
      setTypes(response.data || []);
    } catch (err) {
      console.error('Erreur chargement types:', err);
      setError('Erreur lors du chargement des types d\'opération');
    } finally {
      setLoadingTypes(false);
    }
  };

  const handleCreerType = async () => {
    if (!nouveauType.libelle.trim()) {
      setError('Veuillez saisir un libellé');
      return;
    }

    try {
      const response = await privateApi.post('/api/type-operations', nouveauType);
      setTypes([...types, response.data]);
      setTypeOperationId(response.data.id.toString());
      setOpenDialog(false);
      setNouveauType({ libelle: '', sens: 'SORTIE' });
      setError(null);
      setMessage('Type d\'opération créé avec succès');
    } catch (err) {
      console.error('Erreur création type:', err);
      setError(err.response?.data?.message || 'Erreur lors de la création du type');
    }
  };

  const handleEnregistrer = async () => {
    if (!typeOperationId) {
      setError('Veuillez sélectionner un type d\'opération');
      return;
    }

    if (!montant || parseFloat(montant) <= 0) {
      setError('Veuillez saisir un montant valide');
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const params = new URLSearchParams({
        pvId: pvId.toString(),
        typeOperationId: typeOperationId.toString(),
        montant: montant.toString(),
        commentaire: commentaire
      });

      console.log('Envoi mouvement caisse:', params.toString());
      const response = await privateApi.post(`/api/caisse/mouvement?${params.toString()}`);

      // Redirection vers le journal après enregistrement
      navigate('/accueil/caisse/journal');
    } catch (err) {
      console.error('Erreur enregistrement mouvement:', err);
      setError(err.response?.data?.message || err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Nouvelle Opération de Caisse
          </Typography>

          {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {caisseOuverte === false && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              La caisse n'est pas ouverte. Veuillez d'abord ouvrir la caisse.
              <Button 
                variant="outlined" 
                size="small" 
                onClick={() => navigate('/accueil/caisse/ouverture')}
                sx={{ ml: 2 }}
              >
                Ouvrir la Caisse
              </Button>
            </Alert>
          )}

          {caisseOuverte && (
            <>

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Type d'opération *</InputLabel>
              <Select
                value={typeOperationId}
                onChange={(e) => setTypeOperationId(e.target.value)}
                label="Type d'opération *"
                disabled={loadingTypes}
              >
                {loadingTypes ? (
                  <MenuItem disabled>Chargement...</MenuItem>
                ) : types.length === 0 ? (
                  <MenuItem disabled>Aucun type disponible</MenuItem>
                ) : (
                  types.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.libelle} ({t.sens === 'ENTREE' ? 'Entrée' : 'Sortie'})
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <Button 
              variant="outlined" 
              onClick={() => setOpenDialog(true)}
              sx={{ minWidth: '120px' }}
              disabled={loadingTypes}
            >
              + Nouveau
            </Button>
          </Box>

          <TextField
            fullWidth
            label="Montant *"
            type="number"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            sx={{ mb: 3 }}
            required
            InputLabelProps={{
              shrink: true,
            }}
          />

          <TextField
            fullWidth
            label="Libellé"
            multiline
            rows={2}
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Ex: transport, fournitures, vente..."
            sx={{ mb: 3 }}
            InputLabelProps={{
              shrink: true,
            }}
          />

          <Button
            fullWidth
            variant="contained"
            onClick={handleEnregistrer}
            disabled={loading}
          >
            {loading ? 'Enregistrement...' : 'Enregistrer l\'opération'}
          </Button>
          </>
          )}
        </CardContent>
      </Card>

      {/* Dialog pour créer un nouveau type */}
      {caisseOuverte && (
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Créer un nouveau type d'opération</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Libellé *"
            value={nouveauType.libelle}
            onChange={(e) => setNouveauType({ ...nouveauType, libelle: e.target.value })}
            sx={{ mt: 2, mb: 3 }}
            autoFocus
          />
          
          <FormControl component="fieldset">
            <FormLabel component="legend">Sens de l'opération</FormLabel>
            <RadioGroup
              row
              value={nouveauType.sens}
              onChange={(e) => setNouveauType({ ...nouveauType, sens: e.target.value })}
            >
              <FormControlLabel value="ENTREE" control={<Radio />} label="Entrée (recette)" />
              <FormControlLabel value="SORTIE" control={<Radio />} label="Sortie (dépense)" />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreerType}>Créer</Button>
        </DialogActions>
      </Dialog>
      )}
    </Box>
  );
}
