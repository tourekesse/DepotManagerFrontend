import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField
} from '@mui/material';
import { privateApi } from '../../../api/axios';
import useActivePointDeVenteId from '../../../hooks/useActivePointDeVenteId';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../../utils/currencyUtils';

export default function FermeturesAutoCaisse() {
  const navigate = useNavigate();
  const pvId = useActivePointDeVenteId();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!pvId) return;
    chargerRapport(pvId);
  }, [pvId]);

  const chargerRapport = async (activePvId) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ pvId: activePvId });
      const response = await privateApi.get(`/api/caisse/fermetures-auto?${params.toString()}`);
      setData(response.data || []);
    } catch (err) {
      console.error('Erreur rapport caisses mal fermées:', err);
      setError('Erreur lors du chargement du rapport');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '';
    return new Date(`${dateValue}T00:00:00`).toLocaleDateString('fr-FR');
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: '100%' }}>
      <Card>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6">
              Caisses mal fermées (fermeture automatique)
            </Typography>
            <Button size="small" variant="outlined" onClick={() => navigate('/accueil/caisse/journal')}>
              ← Journal
            </Button>
          </Box>

          <Alert severity="warning" sx={{ mb: 2 }}>
            Ces caisses ont été fermées automatiquement par le serveur à 23h59 car l'employé a oublié de clôturer.
            Aucun comptage physique n'a été enregistré (écart = non renseigné).
          </Alert>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {loading ? (
            <Typography>Chargement...</Typography>
          ) : data.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              Aucune caisse mal fermée sur les 30 derniers jours. Bien joué !
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell><b>Date</b></TableCell>
                    <TableCell><b>Ouverte par</b></TableCell>
                    <TableCell><b>Solde initial</b></TableCell>
                    <TableCell align="right"><b>Solde à la clôture</b></TableCell>
                    <TableCell align="right"><b>Écart</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.caisseId} hover>
                      <TableCell>{formatDate(row.dateOuverture)}</TableCell>
                      <TableCell>{row.openedByName || `Employé #${row.openedBy || '?'}`}</TableCell>
                      <TableCell>{formatCurrency(row.montantInitial)}</TableCell>
                      <TableCell align="right">{formatCurrency(row.soldeFinal)}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label="Non compté (SYSTÈME)"
                          color="warning"
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
