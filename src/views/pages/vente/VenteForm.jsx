import * as React from 'react';
import { 
  Box, Button, IconButton, Stack, Tooltip, Alert, 
  useTheme, useMediaQuery, Card, CardContent, Typography, Divider, Grid 
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorefrontIcon from '@mui/icons-material/Storefront'; // Import pour l'icône
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../../crud-dashboard/components/PageContainer';
import useNotifications from '../../../crud-dashboard/hooks/useNotifications/useNotifications';
import { fetchProduitsByPointDeVente, deleteProduit } from '../../../api/produitsApi';
import { useUser } from '../../../context/UserContext';
import { formatCurrency } from '../../../utils/currencyUtils';

export default function ProductList() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const { activePointDeVente } = useUser();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const loadData = React.useCallback(async () => {
    if (!activePointDeVente?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProduitsByPointDeVente(activePointDeVente.id);
      setRows(data || []);
    } catch (e) {
      console.error("Erreur de chargement:", e);
      setError("Impossible de charger les produits.");
      notifications.show('Erreur de connexion au serveur', { severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [activePointDeVente?.id, notifications]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (row) => {
    if(window.confirm(`Voulez-vous vraiment supprimer ${row.designation} ?`)) {
      try {
        await deleteProduit(row.id, activePointDeVente.id);
        notifications.show('Produit supprimé avec succès', { severity: 'success' });
        loadData();
      } catch (err) {
        notifications.show('Erreur lors de la suppression', { severity: 'error' });
      }
    }
  };

  const columns = [
    { field: 'designation', width: 200, headerName: 'Désignation', flex: 1 },
    { 
      field: 'prixAchatHt', 
      headerName: 'Prix Achat', 
      width: 150,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (params) => {
        const val = typeof params === 'object' ? params.value : params;
        return formatCurrency(val);
      }
    },
    { 
      field: 'prixVenteHt', 
      headerName: 'Prix Vente', 
      width: 150,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (params) => {
        const val = typeof params === 'object' ? params.value : params;
        return formatCurrency(val);
      }
    },
    { 
      field: 'stockInitial', 
      headerName: 'Stock Restant', 
      width: 130,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'actions',
      type: 'actions',
      width: 100,
      getActions: ({ row }) => [
        <GridActionsCellItem icon={<EditIcon />} label="Modifier" onClick={() => navigate(`/accueil/produits/${row.id}/edit`)} color="primary" />,
        <GridActionsCellItem icon={<DeleteIcon />} label="Supprimer" onClick={() => handleDelete(row)} color="error" />,
      ],
    },
  ];

  const renderMobileView = () => (
    <Stack spacing={2} sx={{ mt: 2 }}>
      {rows.map((row) => (
        <Card key={row.id} sx={{ borderRadius: 2, boxShadow: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{row.designation}</Typography>
              <Box>
                <IconButton size="small" color="primary" onClick={() => navigate(`/accueil/produits/${row.id}/edit`)}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => handleDelete(row)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">Prix Vente</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatCurrency(row.prixVenteHt)}</Typography>
              </Grid>
              <Grid item xs={6} sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="textSecondary">Stock</Typography>
                <Typography variant="body2" sx={{ 
                  color: row.stockInitial <= row.stockMinimum ? 'error.main' : 'success.main',
                  fontWeight: 'bold' 
                }}>
                  {row.stockInitial}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );

  return (
    <PageContainer
      // ✅ Titre dynamique avec le nom du Point de Vente
      title={
        <Stack spacing={0.2}>
          <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 'bold' }}>
            Gestion des Produits
          </Typography>
          {activePointDeVente && (
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'primary.main', 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.5,
                textTransform: 'uppercase'
              }}
            >
              <StorefrontIcon sx={{ fontSize: 14 }} />
              Dépôt : {activePointDeVente.nom || 'Sélectionné'}
            </Typography>
          )}
        </Stack>
      }
      actions={
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Actualiser">
            <IconButton onClick={loadData} disabled={loading}><RefreshIcon /></IconButton>
          </Tooltip>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => navigate('/accueil/produits/nouveau')}
            sx={{ bgcolor: '#1a237e', '&:hover': { bgcolor: '#0d1440' }, px: { xs: 1, sm: 2 } }}
          >
            {isMobile ? "Nouveau" : "Nouveau Produit"}
          </Button>
        </Stack>
      }
    >
      <Box sx={{ width: '100%', mt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        {isMobile ? (
          renderMobileView()
        ) : (
          <Box sx={{ height: 650, width: '100%' }}>
            <DataGrid 
              rows={rows} 
              columns={columns} 
              loading={loading} 
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              sx={{ 
                border: 'none', boxShadow: 1, borderRadius: 2, bgcolor: 'background.paper',
                '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f8f9fa' }
              }}
            />
          </Box>
        )}
      </Box>
    </PageContainer>
  );
}