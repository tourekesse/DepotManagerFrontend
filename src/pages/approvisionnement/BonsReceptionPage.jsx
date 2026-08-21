import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  IconButton,
  Alert,
  TextField,
  MenuItem
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add, Visibility, Check, Cancel } from '@mui/icons-material';
import { privateApi } from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/currencyUtils';

const STATUT_COLORS = {
  EN_ATTENTE: 'warning',
  VALIDE: 'success',
  ANNULE: 'error'
};

const BonsReceptionPage = () => {
  const navigate = useNavigate();
  const [bons, setBons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');

  useEffect(() => {
    loadBons();
  }, [filtreStatut]);

  const loadBons = async () => {
    try {
      setLoading(true);
      const params = { page: 0, size: 100 };
      if (filtreStatut) {
        params.statut = filtreStatut;
      }
      
      const response = await privateApi.get('/api/bons-reception', { params });
      setBons(response.data.content || []);
    } catch (err) {
      setError('Erreur lors du chargement des bons de réception');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleValider = async (id) => {
    if (!window.confirm('Voulez-vous vraiment valider ce bon de réception ? Le stock sera mis à jour.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await privateApi.post(`/api/bons-reception/${id}/valider`, null, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setSuccess('Bon de réception validé avec succès');
      loadBons();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la validation');
      console.error(err);
    }
  };

  const handleAnnuler = async (id) => {
    if (!window.confirm('Voulez-vous vraiment annuler ce bon de réception ?')) {
      return;
    }

    try {
      await privateApi.post(`/api/bons-reception/${id}/annuler`);
      setSuccess('Bon de réception annulé');
      loadBons();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'annulation');
      console.error(err);
    }
  };

  const columns = [
    {
      field: 'numeroBon',
      headerName: 'N° Bon',
      width: 120
    },
    {
      field: 'dateReception',
      headerName: 'Date',
      width: 120,
      valueFormatter: (params) => new Date(params.value).toLocaleDateString('fr-FR')
    },
    {
      field: 'fournisseurNom',
      headerName: 'Fournisseur',
      flex: 1,
      minWidth: 200
    },
    {
      field: 'numeroLivraisonFournisseur',
      headerName: 'N° Livraison',
      width: 130
    },
    {
      field: 'montantTotal',
      headerName: 'Montant Total',
      width: 150,
      renderCell: (params) => (
        <Typography fontWeight="bold">
          {formatCurrency(params.value)}
        </Typography>
      )
    },
    {
      field: 'statut',
      headerName: 'Statut',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={STATUT_COLORS[params.value] || 'default'}
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            color="primary"
            onClick={() => navigate(`/accueil/approvisionnement/bons/${params.row.id}`)}
            title="Voir détails"
          >
            <Visibility />
          </IconButton>
          {params.row.statut === 'EN_ATTENTE' && (
            <>
              <IconButton
                size="small"
                color="success"
                onClick={() => handleValider(params.row.id)}
                title="Valider"
              >
                <Check />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleAnnuler(params.row.id)}
                title="Annuler"
              >
                <Cancel />
              </IconButton>
            </>
          )}
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Bons de Réception
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/accueil/approvisionnement/bons/nouveau')}
        >
          Nouveau Bon
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

      <Box sx={{ mb: 2 }}>
        <TextField
          select
          label="Filtrer par statut"
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">Tous</MenuItem>
          <MenuItem value="EN_ATTENTE">En attente</MenuItem>
          <MenuItem value="VALIDE">Validé</MenuItem>
          <MenuItem value="ANNULE">Annulé</MenuItem>
        </TextField>
      </Box>

      <Paper>
        <DataGrid
          rows={bons}
          columns={columns}
          loading={loading}
          autoHeight
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          disableSelectionOnClick
          sx={{ border: 'none' }}
        />
      </Paper>
    </Box>
  );
};

export default BonsReceptionPage;
