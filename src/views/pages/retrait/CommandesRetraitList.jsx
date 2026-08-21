
import * as React from 'react';
import {
  Box, Button, IconButton, Stack, Tooltip, Alert,
  useTheme, useMediaQuery, Card, CardContent, Typography, Divider, Grid, Chip,
  Menu, MenuItem, ListItemText, Checkbox
} from '@mui/material';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../../crud-dashboard/components/PageContainer';
import useNotifications from '../../../crud-dashboard/hooks/useNotifications/useNotifications';
import { privateApi } from '../../../api/axios';
import GererCasiersModal from '../../../components/GererCasiersModal';
import PrintReceiptButton from '../../../components/PrintReceiptButton';
import AssignerLivreurModal from '../../../components/AssignerLivreurModal';
import { formatDateCI } from '../../../utils/dateUtils';
import { useUser } from '../../../context/UserContext';
import { formatCurrency } from '../../../utils/currencyUtils';

export default function CommandesRetraitList() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { activePointDeVente, user } = useUser();
  const role = (user?.role || '').toUpperCase();
  const isGerant = role.includes('GERANT');
  
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  // States pour gérer casiers
  const [casiersModalOpen, setCasiersModalOpen] = React.useState(false);
  const [selectedVenteForCasiers, setSelectedVenteForCasiers] = React.useState(null);
  const [ventesCasiers, setVentesCasiers] = React.useState([]);
  const [clientNomForCasiers, setClientNomForCasiers] = React.useState('');
  const [columnAnchorEl, setColumnAnchorEl] = React.useState(null);
  const [visibleOptionalCols, setVisibleOptionalCols] = React.useState([]);
  const [livreurModalOpen, setLivreurModalOpen] = React.useState(false);
  const [commandeForLivreur, setCommandeForLivreur] = React.useState(null);

  const loadData = React.useCallback(async () => {
    if (!activePointDeVente?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 🔥 UTILISER l'endpoint principal avec statut=EN_ATTENTE filtré en dur
      const res = await privateApi.get(`/api/commandes?pointDeVenteId=${activePointDeVente.id}&statut=EN_ATTENTE`);
      const commandesEnAttente = (res.data || []).map(cmd => ({
        id: cmd.id,
        nomClient: cmd.clientNom || 'Client',
        dateCommande: cmd.dateCommande,
        totalGeneral: cmd.montantTotal,
        statutLivraison: cmd.statut || 'EN_ATTENTE',
        modeRetrait: cmd.modeRetrait,
        livreur: cmd.livreurNom,
        livreurId: cmd.livreurId,
        client: { id: cmd.clientId, raisonsociale: cmd.clientNom },
        estCommande: true,
        statutCommande: cmd.statut,
        montantEmballage: cmd.montantEmballage || 0,
        montantLiquide: cmd.montantLiquide || 0
      }));
      setRows(commandesEnAttente);
    } catch (e) {
      setError("Impossible de charger les commandes en attente.");
      notifications.show('Erreur de connexion au serveur', { severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [notifications, activePointDeVente]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Ouvrir la gestion des casiers pour une commande
  const handleOpenCasiers = async (row) => {
    try {
      const res = await privateApi.get(`/api/commandes/${row.id}`);
      const commandeDetails = res.data;
      
      const mtEmballage = row.montantEmballage || 0;
      
      setClientNomForCasiers(row.nomClient || commandeDetails.client?.raisonsociale || commandeDetails.client?.nom || 'Client');
      setSelectedVenteForCasiers({
        venteId: row.id,
        dateVente: commandeDetails.dateCommande,
        mtEmballage: mtEmballage,
        montantLiquide: commandeDetails.montantLiquide,
        montantEmballage: commandeDetails.montantEmballage,
        estCommande: row.estCommande,
        montantTotal: commandeDetails.montantTotal,
        lignes: commandeDetails.lignes || []
      });
      setVentesCasiers([{
        venteId: row.id,
        dateVente: commandeDetails.dateCommande,
        mtEmballage: mtEmballage,
        montantLiquide: commandeDetails.montantLiquide,
        montantEmballage: commandeDetails.montantEmballage,
        montantTotal: commandeDetails.montantTotal,
        lignes: commandeDetails.lignes || []
      }]);
      setCasiersModalOpen(true);
    } catch (error) {
      console.error('Erreur lors du chargement des détails de la commande:', error);
      notifications.show('Erreur lors du chargement des détails de la commande', { severity: 'error' });
    }
  };

  const optionalColumnsConfig = [
    { field: 'dateCommande', label: 'Date' },
    { field: 'id', label: 'ID' },
  ];

  const renderStatutChip = (row) => {
    const statut = row.statutCommande || row.statutLivraison;
    const mode = row.modeRetrait;
    const estLivree = statut === 'LIVREE' || statut === 'LIVREE_ET_PAYEE' || statut === 'LIVREE_EN_ATTENTE_PAIEMENT';
    
    if (estLivree) {
      return (
        <Chip
          label="✅ Livrée"
          size="small"
          sx={{bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 'bold'}}
        />
      );
    }
    
    // Badges selon le mode de retrait
    if (mode === 'LIVRAISON') {
      return (
        <Chip
          label="🚚 À assigner (Livreur)"
          size="small"
          sx={{bgcolor: '#fff3e0', color: '#ed6c02', fontWeight: 'bold'}}
        />
      );
    }
    
    if (mode === 'RETRAIT') {
      return (
        <Chip
          label="🏪 À valider (Vente)"
          size="small"
          sx={{bgcolor: '#e3f2fd', color: '#1976d2', fontWeight: 'bold'}}
        />
      );
    }
    
    return (
      <Chip
        label="🟠 À traiter"
        size="small"
        sx={{bgcolor: '#fff3e0', color: '#ed6c02', fontWeight: 'bold'}}
      />
    );
  };

  const columns = [
    { field: 'id', headerName: 'ID', width: 80 },
    { field: 'nomClient', headerName: 'Client', width: 130 },
    {
      field: 'dateCommande',
      headerName: 'Date',
      width: 140,
      renderCell: (params) => formatDateCI(params.row.dateCommande)
    },
    {
      field: 'modeRetrait',
      headerName: 'Mode',
      width: 110,
      renderCell: (params) => {
        const mode = params.row.modeRetrait;
        const hasLivreur = params.row.livreurId;
        if (mode === 'LIVRAISON') {
          if (hasLivreur) {
            return (
              <Chip 
                label="Assigné" 
                size="small" 
                color="success" 
                sx={{ fontWeight: 'bold' }}
              />
            );
          }
          return '🚚 Livraison';
        }
        if (mode === 'RETRAIT') return '🏪 Retrait';
        return mode || '-';
      }
    },
    {
      field: 'totalGeneral',
      headerName: 'Montant',
      width: 110,
      renderCell: (params) => params.value ? formatCurrency(parseFloat(params.value)) : ''
    },
    {
      field: 'statutLivraison',
      headerName: 'Statut',
      width: 130,
      renderCell: (params) => renderStatutChip(params.row)
    },
    {
      field: 'validation',
      headerName: 'Validation',
      width: 240,
      renderCell: (params) => {
        const row = params.row;
        const estLivree = ['LIVREE', 'LIVREE_ET_PAYEE', 'LIVREE_EN_ATTENTE_PAIEMENT'].includes(row.statutCommande || row.statutLivraison);
        
        if (estLivree) {
          return null;
        }
        
        // Pour LIVRAISON : bouton assigner livreur
        if (row.modeRetrait === 'LIVRAISON') {
          return (
            <Button
              variant="contained"
              size="small"
              startIcon={<LocalShippingIcon />}
              onClick={() => {
                setCommandeForLivreur(row);
                setLivreurModalOpen(true);
              }}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Assigner livreur
            </Button>
          );
        }
        
        // Pour RETRAIT : bouton transformer en vente
        if (row.modeRetrait === 'RETRAIT') {
          return (
            <Button
              variant="contained"
              size="small"
              startIcon={<StorefrontIcon />}
              onClick={() => navigate('/accueil/livraisons', { state: { commandeId: row.id } })}
              sx={{ borderRadius: 2, textTransform: 'none', bgcolor: '#1976d2' }}
            >
              Transformer en vente
            </Button>
          );
        }
        
        return null;
      }
    },
    {
      field: 'actions',
      type: 'actions',
      width: 150,
      getActions: ({ row }) => {
        const actions = [];

        // Action de gestion des casiers
        actions.push(
          <GridActionsCellItem
            icon={<Inventory2Icon />}
            label="Gérer casiers"
            onClick={() => handleOpenCasiers(row)}
            color="secondary"
            title="Gérer les casiers/vides rendus"
          />
        );

        if (isGerant) {
          actions.push(<PrintReceiptButton venteId={row.id} size="small" />);
        }

        return actions;
      },
    },
  ];

  const renderMobileView = () => {
    return (
      <>
        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2, mb: 1 }}>
          <Button
            size="small"
            variant={visibleOptionalCols.length > 0 ? 'contained' : 'outlined'}
            startIcon={<ViewColumnIcon />}
            onClick={(e) => setColumnAnchorEl(e.currentTarget)}
          >
            Colonnes
          </Button>
          <Menu
            anchorEl={columnAnchorEl}
            open={Boolean(columnAnchorEl)}
            onClose={() => setColumnAnchorEl(null)}
          >
            {optionalColumnsConfig.map(col => (
              <MenuItem key={col.field} onClick={() => {
                setVisibleOptionalCols(prev =>
                  prev.includes(col.field) ? prev.filter(f => f !== col.field) : [...prev, col.field]
                );
              }}>
                <Checkbox checked={visibleOptionalCols.includes(col.field)} size="small" />
                <ListItemText>{col.label}</ListItemText>
              </MenuItem>
            ))}
          </Menu>
        </Stack>
        <Stack spacing={2}>
          {rows.map((row) => (
            <Card key={row.id} sx={{ borderRadius: 2, boxShadow: 1 }}>
              <CardContent sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {row.nomClient}
                  </Typography>
                  <Box>
                    {isGerant && (
                      <IconButton
                        size="small"
                        color="secondary"
                        onClick={() => handleOpenCasiers(row)}
                      >
                        <Inventory2Icon fontSize="small" />
                      </IconButton>
                    )}
                    {isGerant && (
                      <Box component="span" sx={{ ml: 0.3 }}>
                        <PrintReceiptButton venteId={row.id} size="small" />
                      </Box>
                    )}
                  </Box>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Stack spacing={0.8}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Mode</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {row.modeRetrait === 'LIVRAISON' ? '🚚 Livraison' : '🏪 Retrait'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Montant</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatCurrency(parseFloat(row.totalGeneral || 0))}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Statut</Typography>
                    {renderStatutChip(row)}
                  </Box>
                  {visibleOptionalCols.includes('dateCommande') && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Date</Typography>
                      <Typography variant="body2">{formatDateCI(row.dateCommande)}</Typography>
                    </Box>
                  )}
                  {visibleOptionalCols.includes('id') && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">ID</Typography>
                      <Typography variant="body2">{row.id}</Typography>
                    </Box>
                  )}
                  {row.modeRetrait === 'LIVRAISON' && !['LIVREE', 'LIVREE_ET_PAYEE', 'LIVREE_EN_ATTENTE_PAIEMENT'].includes(row.statutCommande || row.statutLivraison) && (
                    <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #eee' }}>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<LocalShippingIcon />}
                        onClick={() => {
                          setCommandeForLivreur(row);
                          setLivreurModalOpen(true);
                        }}
                        sx={{ borderRadius: 2, textTransform: 'none', width: '100%' }}
                      >
                        Assigner livreur
                      </Button>
                    </Box>
                  )}
                  {row.modeRetrait === 'RETRAIT' && !['LIVREE', 'LIVREE_ET_PAYEE', 'LIVREE_EN_ATTENTE_PAIEMENT'].includes(row.statutCommande || row.statutLivraison) && (
                    <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #eee' }}>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<StorefrontIcon />}
                        onClick={() => navigate('/accueil/livraisons', { state: { commandeId: row.id } })}
                        sx={{ borderRadius: 2, textTransform: 'none', width: '100%', bgcolor: '#1976d2' }}
                      >
                        Transformer en vente
                      </Button>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </>
    );
  };

  return (
    <>
    <PageContainer
      title={
        <Stack spacing={0.2} direction="row" alignItems="center">
          <LocalShippingIcon sx={{ fontSize: 22, color: 'orange' }} />
          <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 'bold', color: 'orange' }}>
            Commandes en attente
          </Typography>
        </Stack>
      }
      actions={
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Actualiser">
            <IconButton onClick={loadData} disabled={loading}><RefreshIcon /></IconButton>
          </Tooltip>
        </Stack>
      }
    >
      <Box sx={{ width: '100%', mt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {isMobile ? (
          renderMobileView()
        ) : (
          <Box sx={{ height: 650, width: '100%', overflowX: 'auto' }}>
            <Box sx={{ minWidth: 900 }}>
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
          </Box>
        )}
      </Box>
    </PageContainer>
    <GererCasiersModal
      open={casiersModalOpen}
      onClose={() => {
        setCasiersModalOpen(false);
        setSelectedVenteForCasiers(null);
      }}
      vente={selectedVenteForCasiers}
      onValidate={() => {
        loadData();
        setCasiersModalOpen(false);
        setSelectedVenteForCasiers(null);
        setVentesCasiers([]);
        notifications.show("Casiers gérés avec succès", { severity: "success" });
      }}
      clientNom={clientNomForCasiers}
      ventesCasiers={ventesCasiers}
    />
    <AssignerLivreurModal
      open={livreurModalOpen}
      onClose={() => {
        setLivreurModalOpen(false);
        setCommandeForLivreur(null);
      }}
      commandeId={commandeForLivreur?.id}
      onSuccess={() => {
        loadData();
        notifications.show("Livreur assigné avec succès", { severity: "success" });
      }}
    />
    </>
  );
}
