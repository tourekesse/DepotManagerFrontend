import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Chip,
  CircularProgress, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Print, LocalShipping } from '@mui/icons-material';
import { privateApi } from '../../api/axios';
import useActivePointDeVenteId from '../../hooks/useActivePointDeVenteId';
import { formatCurrency } from '../../utils/currencyUtils';

const formatF = (n) => formatCurrency(n || 0);

const ReceptionLivraison = () => {
  const pointDeVenteId = useActivePointDeVenteId();
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [receptionDialog, setReceptionDialog] = useState({
    open: false,
    commande: null,
    lignes: [],
    loadingLignes: false,
  });
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    loadCommandes();
  }, [pointDeVenteId]);

  const loadCommandes = async () => {
    if (!pointDeVenteId) return;
    try {
      setLoading(true);
      const response = await privateApi.get('/api/reapprovisionnement/commandes-en-cours', {
        headers: { 'X-PV-ID': pointDeVenteId }
      });
      setCommandes(response.data || []);
    } catch (err) {
      console.error(err);
      setError('Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (commandeId) => {
    window.open(`/api/reapprovisionnement/bon-commande/${commandeId}/pdf`, '_blank');
  };

  const handleOpenReception = async (commande) => {
    setReceptionDialog({ open: true, commande, lignes: [], loadingLignes: true });
    try {
      const response = await privateApi.get(`/api/reapprovisionnement/bon-commande/${commande.id}`);
      const raw = response.data?.lignes || response.data?.ligneCommandes || [];
      const lignes = Array.isArray(raw) ? raw : Array.isArray(response.data) ? response.data : [];
      setReceptionDialog(prev => ({
        ...prev,
        loadingLignes: false,
        lignes: (Array.isArray(lignes) ? lignes : []).map(l => {
          const commandee = l.quantiteValidee || l.quantiteSuggeree || l.quantiteCommandee || 0;
          const dejaRecue = l.quantiteRecue || 0;
          const reste = Math.max(0, commandee - dejaRecue);
          return {
            id: l.id || l.typeCasierId || Math.random(),
            typeCasierId: l.typeCasierId,
            typeCasierNom: l.typeCasierNom || l.nomProduit || 'Produit',
            quantiteCommandee: commandee,
            quantiteDejaRecue: dejaRecue,
            quantiteARecevoir: reste,
          };
        })
      }));
    } catch {
      if (commande.lignes && Array.isArray(commande.lignes)) {
        setReceptionDialog(prev => ({
          ...prev,
          loadingLignes: false,
          lignes: commande.lignes.map(l => {
            const commandee = l.quantiteValidee || l.quantiteSuggeree || l.quantiteCommandee || 0;
            const dejaRecue = l.quantiteRecue || 0;
            return {
              id: l.id || l.typeCasierId || Math.random(),
              typeCasierId: l.typeCasierId,
              typeCasierNom: l.typeCasierNom || l.nomProduit || 'Produit',
              quantiteCommandee: commandee,
              quantiteDejaRecue: dejaRecue,
              quantiteARecevoir: Math.max(0, commandee - dejaRecue),
            };
          })
        }));
      } else {
        setReceptionDialog(prev => ({
          ...prev,
          loadingLignes: false,
          lignes: [{
            id: 1,
            typeCasierNom: 'Tous les articles',
            quantiteCommandee: commande.nombreArticles || 0,
            quantiteDejaRecue: 0,
            quantiteARecevoir: commande.nombreArticles || 0,
          }]
        }));
      }
    }
  };

  const handleCloseReception = () => {
    if (confirming) return;
    setReceptionDialog({ open: false, commande: null, lignes: [], loadingLignes: false });
  };

  const updateLigneQty = (ligneId, value) => {
    const qty = Math.max(0, parseInt(value) || 0);
    setReceptionDialog(prev => ({
      ...prev,
      lignes: prev.lignes.map(l =>
        l.id === ligneId ? { ...l, quantiteARecevoir: Math.min(qty, l.quantiteCommandee - l.quantiteDejaRecue) } : l
      )
    }));
  };

  const handleConfirmReception = async () => {
    const commandeId = receptionDialog.commande.id;
    setConfirming(true);
    try {
      await privateApi.post(`/api/reapprovisionnement/recevoir/${commandeId}`,
        { lignesRecues: receptionDialog.lignes.map(l => ({
            typeCasierId: l.typeCasierId,
            quantiteRecue: l.quantiteARecevoir
          }))
        },
        { headers: { 'X-PV-ID': pointDeVenteId } }
      );
      setSuccess('Réception confirmée avec succès');
      handleCloseReception();
      loadCommandes();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la confirmation');
    } finally {
      setConfirming(false);
    }
  };

  const getStatutChip = (commande) => {
    if (!commande.lignes) return <Chip label={commande.statut || 'En attente'} size="small" color="warning" />;
    const total = commande.lignes.reduce((s, l) => s + (l.quantiteValidee || l.quantiteSuggeree || 0), 0);
    const recu = commande.lignes.reduce((s, l) => s + (l.quantiteRecue || 0), 0);
    if (recu >= total) return <Chip label="Reçue" size="small" color="success" />;
    if (recu > 0) return <Chip label={`Partielle (${recu}/${total})`} size="small" color="info" />;
    return <Chip label="En attente" size="small" color="warning" />;
  };

  const columns = [
    { field: 'numeroBon', headerName: 'N° Bon', flex: 1, minWidth: 150 },
    {
      field: 'dateCreation',
      headerName: 'Date',
      width: 180,
      valueFormatter: (value) => value ? new Date(value).toLocaleDateString('fr-FR') : '',
    },
    { field: 'nombreArticles', headerName: 'Nb Articles', width: 100 },
    {
      field: 'montantTotal',
      headerName: 'Montant Total',
      width: 150,
      renderCell: (params) => <strong>{formatF(params.value)}</strong>,
    },
    {
      field: 'statut',
      headerName: 'Statut',
      width: 150,
      renderCell: (params) => getStatutChip(params.row),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 280,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" color="primary" onClick={() => handlePrint(params.row.id)} title="Imprimer">
            <Print />
          </IconButton>
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<LocalShipping />}
            onClick={() => handleOpenReception(params.row)}
          >
            Réceptionner
          </Button>
        </Box>
      ),
    },
  ];

  if (!pointDeVenteId) {
    return <Alert severity="error">Point de vente non identifié</Alert>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Réception Livraison Fournisseur
        </Typography>
        <Button variant="outlined" onClick={loadCommandes}>
          Actualiser
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
          rows={commandes}
          columns={columns}
          loading={loading}
          autoHeight
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          disableSelectionOnClick
          sx={{ border: 'none' }}
        />
      </Paper>

      <Dialog open={receptionDialog.open} onClose={handleCloseReception} maxWidth="sm" fullWidth>
        <DialogTitle>
          Réception - Bon n° {receptionDialog.commande?.numeroBon}
        </DialogTitle>
        <DialogContent>
          {receptionDialog.loadingLignes ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : receptionDialog.lignes.length === 0 ? (
            <Typography color="text.secondary" align="center" py={3}>
              Aucun article à réceptionner
            </Typography>
          ) : (
            <TableContainer sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Produit</TableCell>
                    <TableCell align="center">Commandé</TableCell>
                    <TableCell align="center">Déjà reçu</TableCell>
                    <TableCell align="center">À recevoir</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {receptionDialog.lignes.map((l) => {
                    const maxRec = l.quantiteCommandee - l.quantiteDejaRecue;
                    return (
                      <TableRow key={l.id}>
                        <TableCell>{l.typeCasierNom}</TableCell>
                        <TableCell align="center">{l.quantiteCommandee}</TableCell>
                        <TableCell align="center">{l.quantiteDejaRecue}</TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            size="small"
                            value={l.quantiteARecevoir}
                            onChange={(e) => updateLigneQty(l.id, e.target.value)}
                            inputProps={{ min: 0, max: maxRec }}
                            sx={{ width: 80 }}
                            disabled={maxRec <= 0}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                Ajustez la quantité reçue si elle diffère de la commande
              </Typography>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReception} disabled={confirming}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirmReception}
            variant="contained"
            color="warning"
            disabled={confirming || receptionDialog.lignes.every(l => l.quantiteARecevoir === 0)}
            startIcon={confirming ? <CircularProgress size={20} /> : <LocalShipping />}
          >
            {confirming ? 'Confirmation...' : 'Confirmer la Réception'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReceptionLivraison;
