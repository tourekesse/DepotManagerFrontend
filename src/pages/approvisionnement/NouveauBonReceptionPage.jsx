import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Autocomplete
} from '@mui/material';
import { Add, Delete, Save, ArrowBack } from '@mui/icons-material';
import { privateApi } from '../../api/axios';
import { useNavigate } from 'react-router-dom';

const NouveauBonReceptionPage = () => {
  const navigate = useNavigate();
  const [fournisseurs, setFournisseurs] = useState([]);
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    fournisseurId: '',
    dateReception: new Date().toISOString().split('T')[0],
    numeroLivraisonFournisseur: '',
    notes: ''
  });

  const [lignes, setLignes] = useState([
    { produitId: null, produitObj: null, quantite: 1, prixUnitaire: 0 }
  ]);

  useEffect(() => {
    loadFournisseurs();
    loadProduits();
  }, []);

  const loadFournisseurs = async () => {
    try {
      const response = await privateApi.get('/api/fournisseurs/actifs');
      setFournisseurs(response.data || []);
    } catch (err) {
      console.error('Erreur chargement fournisseurs:', err);
    }
  };

  const loadProduits = async () => {
    try {
      const response = await privateApi.get('/api/produits');
      setProduits(response.data || []);
    } catch (err) {
      console.error('Erreur chargement produits:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddLigne = () => {
    setLignes([...lignes, { produitId: null, produitObj: null, quantite: 1, prixUnitaire: 0 }]);
  };

  const handleRemoveLigne = (index) => {
    if (lignes.length > 1) {
      const newLignes = lignes.filter((_, i) => i !== index);
      setLignes(newLignes);
    }
  };

  const handleLigneChange = (index, field, value) => {
    const newLignes = [...lignes];
    newLignes[index][field] = value;
    setLignes(newLignes);
  };

  const handleProduitChange = (index, produit) => {
    const newLignes = [...lignes];
    newLignes[index].produitObj = produit;
    newLignes[index].produitId = produit ? produit.id : null;
    
    // Pré-remplir le prix avec le prix d'achat ou prix de vente du produit
    if (produit && produit.prixAchat) {
      newLignes[index].prixUnitaire = produit.prixAchat;
    } else if (produit && produit.prixVente) {
      newLignes[index].prixUnitaire = produit.prixVente;
    }
    
    setLignes(newLignes);
  };

  const calculateSousTotal = (ligne) => {
    return ligne.quantite * ligne.prixUnitaire;
  };

  const calculateMontantTotal = () => {
    return lignes.reduce((sum, ligne) => sum + calculateSousTotal(ligne), 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' FCFA';
  };

  const handleSubmit = async () => {
    try {
      setError('');
      setLoading(true);

      // Validation
      if (!formData.fournisseurId) {
        setError('Veuillez sélectionner un fournisseur');
        return;
      }

      if (lignes.length === 0 || lignes.some(l => !l.produitId || l.quantite <= 0 || l.prixUnitaire <= 0)) {
        setError('Veuillez remplir toutes les lignes correctement');
        return;
      }

      const bonData = {
        fournisseurId: parseInt(formData.fournisseurId),
        dateReception: formData.dateReception,
        numeroLivraisonFournisseur: formData.numeroLivraisonFournisseur,
        notes: formData.notes,
        lignes: lignes.map(ligne => ({
          produitId: ligne.produitId,
          quantite: parseInt(ligne.quantite),
          prixUnitaire: parseFloat(ligne.prixUnitaire)
        }))
      };

      await privateApi.post('/api/bons-reception', bonData);
      
      setSuccess('Bon de réception créé avec succès');
      setTimeout(() => {
        navigate('/accueil/approvisionnement/bons');
      }, 1500);
      
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création du bon');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/accueil/approvisionnement/bons')}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          Nouveau Bon de Réception
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Informations générales
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField
            select
            fullWidth
            label="Fournisseur *"
            name="fournisseurId"
            value={formData.fournisseurId}
            onChange={handleChange}
            required
          >
            {fournisseurs.map((f) => (
              <MenuItem key={f.id} value={f.id}>
                {f.raisonsociale} - {f.type}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            type="date"
            label="Date de réception *"
            name="dateReception"
            value={formData.dateReception}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            required
          />

          <TextField
            fullWidth
            label="N° Livraison Fournisseur"
            name="numeroLivraisonFournisseur"
            value={formData.numeroLivraisonFournisseur}
            onChange={handleChange}
          />

          <TextField
            fullWidth
            label="Notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            multiline
            rows={2}
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Produits
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={handleAddLigne}
          >
            Ajouter une ligne
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Produit *</TableCell>
                <TableCell width="120">Quantité *</TableCell>
                <TableCell width="150">Prix Unitaire *</TableCell>
                <TableCell width="150">Sous-total</TableCell>
                <TableCell width="80">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lignes.map((ligne, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Autocomplete
                      options={produits}
                      getOptionLabel={(option) => option.nomProduit || ''}
                      value={ligne.produitObj}
                      onChange={(event, newValue) => handleProduitChange(index, newValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Sélectionner un produit"
                          size="small"
                          required
                        />
                      )}
                      isOptionEqualToValue={(option, value) => option.id === value?.id}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={ligne.quantite}
                      onChange={(e) => handleLigneChange(index, 'quantite', e.target.value)}
                      inputProps={{ min: 1 }}
                      fullWidth
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={ligne.prixUnitaire}
                      onChange={(e) => handleLigneChange(index, 'prixUnitaire', e.target.value)}
                      inputProps={{ min: 0, step: 0.01 }}
                      fullWidth
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight="bold">
                      {formatCurrency(calculateSousTotal(ligne))}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      color="error"
                      onClick={() => handleRemoveLigne(index)}
                      disabled={lignes.length === 1}
                      size="small"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Typography variant="h6">
            Montant Total: {formatCurrency(calculateMontantTotal())}
          </Typography>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          onClick={() => navigate('/accueil/approvisionnement/bons')}
        >
          Annuler
        </Button>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </Box>
    </Box>
  );
};

export default NouveauBonReceptionPage;
