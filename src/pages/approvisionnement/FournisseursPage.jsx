import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Alert,
  IconButton,
  Chip
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add, Edit, Delete } from '@mui/icons-material';
import { privateApi } from '../../api/axios';

const TYPE_FOURNISSEUR = {
  BRASSERIE: 'BRASSERIE',
  GROSSISTE: 'GROSSISTE',
  DISTRIBUTEUR: 'DISTRIBUTEUR',
  AUTRE: 'AUTRE'
};

const FournisseursPage = () => {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentFournisseur, setCurrentFournisseur] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    raisonsociale: '',
    telephone: '',
    email: '',
    adresse: '',
    ville: '',
    type: TYPE_FOURNISSEUR.GROSSISTE,
    notes: '',
    actif: true
  });

  useEffect(() => {
    loadFournisseurs();
  }, []);

  const loadFournisseurs = async () => {
    try {
      setLoading(true);
      const response = await privateApi.get('/api/fournisseurs', {
        params: { page: 0, size: 100 }
      });
      setFournisseurs(response.data.content || []);
    } catch (err) {
      setError('Erreur lors du chargement des fournisseurs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (fournisseur = null) => {
    if (fournisseur) {
      setEditMode(true);
      setCurrentFournisseur(fournisseur);
      setFormData({
        raisonsociale: fournisseur.raisonsociale,
        telephone: fournisseur.telephone,
        email: fournisseur.email || '',
        adresse: fournisseur.adresse || '',
        ville: fournisseur.ville || '',
        type: fournisseur.type,
        notes: fournisseur.notes || '',
        actif: fournisseur.actif
      });
    } else {
      setEditMode(false);
      setCurrentFournisseur(null);
      setFormData({
        raisonsociale: '',
        telephone: '',
        email: '',
        adresse: '',
        ville: '',
        type: TYPE_FOURNISSEUR.GROSSISTE,
        notes: '',
        actif: true
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      setError('');
      
      if (!formData.raisonsociale || !formData.telephone) {
        setError('La raison sociale et le téléphone sont obligatoires');
        return;
      }

      if (editMode && currentFournisseur) {
        await privateApi.put(`/api/fournisseurs/${currentFournisseur.id}`, formData);
        setSuccess('Fournisseur modifié avec succès');
      } else {
        await privateApi.post('/api/fournisseurs', formData);
        setSuccess('Fournisseur créé avec succès');
      }

      handleCloseDialog();
      loadFournisseurs();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Voulez-vous vraiment désactiver ce fournisseur ?')) {
      return;
    }

    try {
      await privateApi.delete(`/api/fournisseurs/${id}`);
      setSuccess('Fournisseur désactivé avec succès');
      loadFournisseurs();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erreur lors de la suppression');
      console.error(err);
    }
  };

  const columns = [
    {
      field: 'raisonsociale',
      headerName: 'Raison sociale',
      flex: 1,
      minWidth: 200
    },
    {
      field: 'telephone',
      headerName: 'Téléphone',
      width: 130
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 180
    },
    {
      field: 'ville',
      headerName: 'Ville',
      width: 120
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color="primary"
          variant="outlined"
        />
      )
    },
    {
      field: 'actif',
      headerName: 'Statut',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Actif' : 'Inactif'}
          size="small"
          color={params.value ? 'success' : 'default'}
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleOpenDialog(params.row)}
          >
            <Edit />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDelete(params.row.id)}
            disabled={!params.row.actif}
          >
            <Delete />
          </IconButton>
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Fournisseurs
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Nouveau Fournisseur
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Paper>
        <DataGrid
          rows={fournisseurs}
          columns={columns}
          loading={loading}
          autoHeight
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          disableSelectionOnClick
          sx={{ border: 'none' }}
        />
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Raison sociale *"
            name="raisonsociale"
            value={formData.raisonsociale}
            onChange={handleChange}
            margin="normal"
          />

          <TextField
            fullWidth
            label="Téléphone *"
            name="telephone"
            value={formData.telephone}
            onChange={handleChange}
            margin="normal"
          />

          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            margin="normal"
          />

          <TextField
            fullWidth
            label="Adresse"
            name="adresse"
            value={formData.adresse}
            onChange={handleChange}
            margin="normal"
          />

          <TextField
            fullWidth
            label="Ville"
            name="ville"
            value={formData.ville}
            onChange={handleChange}
            margin="normal"
          />

          <TextField
            fullWidth
            select
            label="Type *"
            name="type"
            value={formData.type}
            onChange={handleChange}
            margin="normal"
          >
            {Object.values(TYPE_FOURNISSEUR).map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={3}
          />

          {editMode && (
            <TextField
              fullWidth
              select
              label="Statut"
              name="actif"
              value={formData.actif}
              onChange={(e) => setFormData(prev => ({ ...prev, actif: e.target.value === 'true' }))}
              margin="normal"
            >
              <MenuItem value={true}>Actif</MenuItem>
              <MenuItem value={false}>Inactif</MenuItem>
            </TextField>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editMode ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FournisseursPage;
