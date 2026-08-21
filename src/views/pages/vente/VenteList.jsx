import * as React from 'react';
import {
Box,
        Button,
        IconButton,
        Stack,
        Tooltip,
        Typography,
        Chip,
        useMediaQuery,
        Dialog,
        DialogContent
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../../crud-dashboard/components/PageContainer';
import useNotifications from '../../../crud-dashboard/hooks/useNotifications/useNotifications';
import { useUser } from '../../../context/UserContext';
import { fetchVentesByPointDeVente } from '../../../api/ventesApi';
import { formatDateCI } from '../../../utils/dateUtils';
import { getActivePointDeVenteId } from '../../../utils/pdv';
import { formatCurrency } from '../../../utils/currencyUtils';

export default function VenteList() {
    const navigate = useNavigate();
    const notifications = useNotifications();
    const {activePointDeVente} = useUser();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // ✅ pvId DOIT ÊTRE AU NIVEAU DU COMPOSANT
    const pvId = React.useMemo(
        () => getActivePointDeVenteId(),
        [activePointDeVente]
    );

    const [rows, setRows] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [pdfModalOpen, setPdfModalOpen] = React.useState(false);
    const [pdfUrl, setPdfUrl] = React.useState(null);

    const loadData = React.useCallback(async () => {
        console.log("Point de vente utilisé pour le chargement :", pvId);
        console.log("activePointDeVente complet :", activePointDeVente);

        setLoading(true);

        try {
            const data = await fetchVentesByPointDeVente(pvId);

            const ventes = Array.isArray(data) ? data : [];

            const mappedRows = ventes.map((vente) => ({
                    id: vente.id,
                    dateVente: vente.dateVente,
                    nomClient: vente.nomClient,
                    totalGeneral: vente.totalGeneral || 0,
                    statutPaiement: vente.statutPaiement || 'NON_PAYÉE',
                    createurNom: vente.createurNom || 'Utilisateur',
                    modeLivraison: vente.modeLivraison || vente.mode_livraison || 'SUR_PLACE',
                }));

            setRows(mappedRows);

            // Plus de message d'avertissement pour éviter la confusion
            if (mappedRows.length > 0) {
                notifications.show(
                        `${mappedRows.length} vente(s) chargée(s)`,
                        {severity: 'success'}
                );
            }
        } catch (e) {
            console.error("Erreur API :", e);
            notifications.show(
                    "Erreur de connexion à l'API",
                    {severity: 'error'}
            );
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [pvId, activePointDeVente, notifications]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const columns = React.useMemo(() => [
        {
            field: 'dateVente',
            headerName: 'Date',
            width: isMobile ? 100 : 120,
            renderCell: (params) => formatDateCI(params.row.dateVente)
        },
        {
            field: 'nomClient',
            headerName: 'Client',
            width: isMobile ? 120 : 140,
            flex: 1, // Prend tout l'espace restant
            renderCell: (params) => (
                <Tooltip title={params.value} placement="top">
                    <Box sx={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        fontSize: isMobile ? '11px' : '12px',
                        maxWidth: '100%'
                    }}>
                        {params.value}
                    </Box>
                </Tooltip>
            )
        },
        {
            field: 'totalGeneral',
            headerName: 'Montant',
            width: isMobile ? 100 : 120,
            renderCell: (params) => formatCurrency(params.row.totalGeneral)
        },
        {
            field: 'modeLivraison',
            headerName: 'Mode',
            width: isMobile ? 80 : 100,
            renderCell: (params) => {
                const mode = params.value;
                if (mode === 'SUR_PLACE') return 'SUR PLACE';
                if (mode === 'A_LIVRER') return 'A LIVRER';
                return mode || 'SUR PLACE';
            }
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: isMobile ? 80 : 100,
            sortable: false,
            renderCell: (params) => (
                <Tooltip title="Réimprimer le reçu PDF">
                    <IconButton
                        size="small"
                        onClick={async () => {
                            try {
                                const token = localStorage.getItem('token');
                                const response = await fetch(`/api/recu/${params.row.id}/pdf`, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                if (response.ok) {
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    setPdfUrl(url);
                                    setPdfModalOpen(true);
                                } else {
                                    notifications.show('Erreur génération PDF', {severity: 'error'});
                                }
                            } catch (e) {
                                console.error('Erreur PDF:', e);
                                notifications.show('Erreur génération PDF', {severity: 'error'});
                            }
                        }}
                    >
                        <PrintIcon fontSize="inherit" />
                    </IconButton>
                </Tooltip>
            )
        }
    ], [isMobile]);

    return (
                                <PageContainer
                                    title={
                                            <Stack spacing={0.2}>
                                                <Typography variant="h5" sx={{fontWeight: 'bold'}}>
                                                    Historique des Ventes
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                                color: 'primary.main',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                    gap: 0.5
                                                }}
                                                    >
                                                    <StorefrontIcon sx={{fontSize: 14}} />
                                                    Dépôt : {activePointDeVente?.nom || 'TOURE DEPOT - PV Principal'}
                                                    &nbsp;(ID utilisé : {pvId})
                                                </Typography>
                                            </Stack>
                                    }
                                    actions={
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Tooltip title="Actualiser">
                                                    <span>
                                                        <IconButton onClick={loadData} disabled={loading}>
                                                            <RefreshIcon />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Button
                                                    variant="contained"
                                                    startIcon={<AddIcon />}
                                                    onClick={() => navigate('/accueil/ventes/nouveau')}
                                                    sx={{bgcolor: '#2e7d32'}}
                                                    >
                                                    {isMobile ? 'Nouveau' : 'Nouvelle Vente'}
                                                </Button>
                                            </Stack>
                                            }
                                            >
                                            <Box sx={{height: isMobile ? 500 : 600, width: '100%', mt: 2}}>
                                                <DataGrid
                                                    rows={rows}
                                                    columns={columns}
                                                    loading={loading}
                                                    pageSizeOptions={[10, 25, 50]}
                                                    initialState={{
                                                                pagination: {
                                                                    paginationModel: {pageSize: 10}
                                                    }
                                                }}
                                                    localeText={{noRowsLabel: 'Aucune vente trouvée'}}
                                                    disableRowSelectionOnClick
                                                    sx={{
                                                        '@media (max-width: 600px)': {
                                                            '& .MuiDataGrid-root': {
                                                                fontSize: '12px',
                                                            },
                                                            '& .MuiDataGrid-columnHeaders': {
                                                                fontSize: '11px',
                                                            }
                                                        }
                                                    }}
                                                    />
                                            </Box>
                                            
                                            <Dialog 
                                                open={pdfModalOpen} 
                                                onClose={() => setPdfModalOpen(false)}
                                                maxWidth="md"
                                                fullWidth
                                                fullScreen={isMobile}
                                            >
                                                <DialogContent sx={{ p: 0, height: isMobile ? '100vh' : '80vh' }}>
                                                    <IconButton
                                                        onClick={() => setPdfModalOpen(false)}
                                                        sx={{ 
                                                            position: 'absolute', 
                                                            right: 8, 
                                                            top: 8, 
                                                            zIndex: 1,
                                                            bgcolor: 'rgba(255,255,255,0.8)'
                                                        }}
                                                    >
                                                        <CloseIcon />
                                                    </IconButton>
                                                    {pdfUrl && (
                                                        <iframe
                                                            src={pdfUrl}
                                                            style={{ 
                                                                width: '100%', 
                                                                height: '100%', 
                                                                border: 'none' 
                                                            }}
                                                            title="Reçu PDF"
                                                        />
                                                    )}
                                                </DialogContent>
                                            </Dialog>
                                        </PageContainer>
                                        );
                            }
