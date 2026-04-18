import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { privateApi } from '../../../api/axios';

export default function TypeOperationList() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({
    libelle: '',
    sens: 'SORTIE',
    pointDeVentes: []
  });

  useEffect(() => {
    chargerTypes();
  }, []);

  const chargerTypes = async () => {
    setLoading(true);
    try {
      const response = await privateApi.get('/api/type-operations');
      setTypes(response.data);
    } catch (err) {
      setError('Erreur lors du chargement des types d\'opération');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (type = null) => {
    if (type) {
      setEditingType(type);
      setFormData({
        libelle: type.libelle,
        sens: type.sens,
        pointDeVentes: type.pointDeVentes || []
      });
    } else {
      setEditingType(null);
      setFormData({
        libelle: '',
        sens: 'SORTIE',
        pointDeVentes: []
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingType(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!formData.libelle.trim()) {
      setError('Le libellé est requis');
      return;
    }

    try {
      if (editingType) {
        await privateApi.put(`/api/type-operations/${editingType.id}`, formData);
      } else {
        await privateApi.post('/api/type-operations', formData);
      }
      handleCloseDialog();
      chargerTypes();
    } catch (err) {
      setError('Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirmer la suppression ?')) return;
    
    try {
      await privateApi.delete(`/api/type-operations/${id}`);
      chargerTypes();
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5">Types d'Opération</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
            >
              Nouveau Type
            </Button>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Libellé</TableCell>
                  <TableCell>Sens</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {types.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>{type.libelle}</TableCell>
                    <TableCell>
                      <Chip
                        label={type.sens === 'ENTREE' ? 'Recette' : 'Dépense'}
                        color={type.sens === 'ENTREE' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleOpenDialog(type)} color="primary">
                        <Edit />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(type.id)} color="error">
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {types.length === 0 && !loading && (
            <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
              Aucun type d'opération
            </Typography>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingType ? 'Modifier' : 'Nouveau'} Type d'Opération
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Libellé *"
            value={formData.libelle}
            onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          />

          <FormControl fullWidth>
            <InputLabel>Sens</InputLabel>
            <Select
              value={formData.sens}
              onChange={(e) => setFormData({ ...formData, sens: e.target.value })}
              label="Sens"
            >
              <MenuItem value="SORTIE">Dépense (Sortie)</MenuItem>
              <MenuItem value="ENTREE">Recette (Entrée)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSave} variant="contained">
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
