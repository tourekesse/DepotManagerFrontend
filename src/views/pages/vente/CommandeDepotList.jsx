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
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../../crud-dashboard/components/PageContainer';
import useNotifications from '../../../crud-dashboard/hooks/useNotifications/useNotifications';
import { useUser } from '../../../context/UserContext';
import { fetchVentesByPointDeVente } from '../../../api/ventesApi';
import { privateApi } from '../../../api/axios';
import { formatDateCI } from '../../../utils/dateUtils';
import { getActivePointDeVenteId } from '../../../utils/pdv';
import { formatCurrency } from '../../../utils/currencyUtils';
import AssignerLivreurModal from '../../../components/AssignerLivreurModal';

export default function CommandeDepotList() {
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
    const [livreurModalOpen, setLivreurModalOpen] = React.useState(false);
    const [commandeForLivreur, setCommandeForLivreur] = React.useState(null);

    const loadData = React.useCallback(async () => {
        console.log("Point de vente utilisé pour le chargement :", pvId);
        console.log("activePointDeVente complet :", activePointDeVente);

        setLoading(true);

        try {
            // 🔥 Historique complet des commandes du dépôt (TOUTES les statuts)
            const res = await privateApi.get(`/api/commandes?pointDeVenteId=${pvId}&statut=TOUTES`);
            console.log("📦 Réponse API historique commandes :", res.data);
            const commandes = (res.data || []).map(cmd => {
                const montantTotal = cmd.montantTotal || 0;
                return {
                    id: cmd.id,
                    dateCommande: cmd.dateCommande,
                    nomClient: cmd.clientNom || cmd.client?.raisonsociale || cmd.client?.nom || 'Client',
                    totalGeneral: Number(montantTotal),
                    statut: cmd.statut,
                    modeRetrait: cmd.modeRetrait,
                    livreur: cmd.livreur,
                    livreurId: cmd.livreurId,
                    client: cmd.client,
                    estCommande: true
                };
            });

            setRows(commandes);

            if (commandes.length > 0) {
                notifications.show(
                    `${commandes.length} commande(s) chargée(s)`,
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

    // Handlers pour le modal de livreur
    const handleAssignerLivreur = (row) => {
        setCommandeForLivreur(row);
        setLivreurModalOpen(true);
    };

    const handleLivreurModalClose = () => {
        setLivreurModalOpen(false);
        setCommandeForLivreur(null);
    };

    const handleLivreurAssignationSuccess = () => {
        loadData();
        handleLivreurModalClose();
        notifications.show("Livreur assigné avec succès", { severity: "success" });
    };

    const columns = React.useMemo(() => [
        {
            field: 'id',
            headerName: 'ID',
            width: isMobile ? 60 : 70,
            renderCell: (params) => `#${params.row.id}`
        },
        {
            field: 'dateCommande',
            headerName: 'Date',
            width: isMobile ? 100 : 120,
            renderCell: (params) => formatDateCI(params.row.dateCommande)
        },
        {
            field: 'nomClient',
            headerName: 'Client',
            width: isMobile ? 120 : 140,
            flex: 1,
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
            field: 'modeRetrait',
            headerName: 'Mode',
            width: isMobile ? 100 : 110,
            renderCell: (params) => {
                const mode = params.row.modeRetrait;
                const isRetrait = mode === 'RETRAIT';
                return (
                    <Chip
                        label={isRetrait ? '🏪 Retrait' : '🚚 Livraison'}
                        size="small"
                        sx={{
                            bgcolor: isRetrait ? '#e3f2fd' : '#fff8e1',
                            color: isRetrait ? '#1565c0' : '#ff8f00',
                            fontWeight: 'bold',
                            fontSize: isMobile ? '11px' : '12px',
                            height: '24px'
                        }}
                    />
                );
            }
        },
        {
            field: 'totalGeneral',
            headerName: 'Montant',
            width: isMobile ? 100 : 120,
            renderCell: (params) => formatCurrency(params.row.totalGeneral)
        },
        {
            field: 'statutLivraison',
            headerName: 'Statut',
            width: isMobile ? 100 : 130,
            renderCell: (params) => {
                const statut = params.row.statut;
                const modeRetrait = params.row.modeRetrait;
                const livreurId = params.row.livreurId;
                
                const estLivree = statut === 'LIVREE' || statut === 'LIVREE_ET_PAYEE' || statut === 'LIVREE_EN_ATTENTE_PAIEMENT';
                
                // Si c'est une livraison et un livreur est assigné, afficher "Assigné"
                if (modeRetrait === 'LIVRAISON' && livreurId) {
                    return (
                        <Chip
                            label="Assigné"
                            size="small"
                            sx={{
                                bgcolor: '#e8f5e9',
                                color: '#2e7d32',
                                fontWeight: 'bold',
                                fontSize: isMobile ? '11px' : '12px',
                                height: '24px'
                            }}
                        />
                    );
                }
                
                const color = estLivree ? '#2e7d32' : '#ed6c02';
                const bgColor = estLivree ? '#e8f5e9' : '#fff3e0';
                
                return (
                    <Chip
                        label={!estLivree && modeRetrait === 'LIVRAISON' ? '🟠 À livrer' : (estLivree ? '✅ Livrée' : '🟠 À retirer')}
                        size="small"
                        sx={{
                            bgcolor: bgColor,
                            color: color,
                            fontWeight: 'bold',
                            fontSize: isMobile ? '11px' : '12px',
                            height: '24px'
                        }}
                    />
                );
            }
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: isMobile ? 120 : 150,
            sortable: false,
            renderCell: (params) => (
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Gérer la commande">
                        <IconButton
                            size="small"
                            onClick={() => navigate(`/accueil/livraisons`, { state: { commandeId: params.row.id } })}
                            sx={{ color: '#1976d2' }}
                        >
                            <StorefrontIcon fontSize="inherit" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Réimprimer le reçu PDF">
                        <IconButton
                            size="small"
                            onClick={async () => {
                                try {
                                    const token = localStorage.getItem('token');
                                    const response = await fetch(`/api/recu-commande/${params.row.id}/pdf`, {
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
                    {params.row.modeRetrait === 'LIVRAISON' && !params.row.livreurId && (
                        <Tooltip title="Assigner un livreur">
                            <IconButton
                                size="small"
                                onClick={() => handleAssignerLivreur(params.row)}
                                sx={{ color: '#ff8f00' }}
                            >
                                <LocalShippingIcon fontSize="inherit" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            )
        }
    ], [isMobile]);

    return (
        <React.Fragment>
            <PageContainer
            title={
                <Stack spacing={0.2}>
                    <Typography variant="h5" sx={{fontWeight: 'bold'}}>
                        Historique des Commandes Dépôt
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
                        <IconButton onClick={loadData} disabled={loading}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate('/accueil/commandes/nouveau')}
                        sx={{bgcolor: '#2e7d32'}}
                    >
                        {isMobile ? 'Nouveau' : 'Nouvelle Commande'}
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
                    localeText={{noRowsLabel: 'Aucune commande trouvée'}}
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
                        <>
                            <Button
                                variant="contained"
                                startIcon={<PrintIcon />}
                                onClick={() => window.open(pdfUrl, '_blank', 'noopener,noreferrer')}
                                sx={{
                                    position: 'absolute',
                                    left: 8,
                                    top: 8,
                                    zIndex: 1,
                                    fontWeight: 700
                                }}
                            >
                                Ouvrir PDF
                            </Button>
                            <iframe
                                src={pdfUrl}
                                style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    border: 'none' 
                                }}
                                title="Reçu PDF"
                            />
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </PageContainer>
        <AssignerLivreurModal
            open={livreurModalOpen}
            onClose={handleLivreurModalClose}
            commandeId={commandeForLivreur?.id}
            onSuccess={handleLivreurAssignationSuccess}
        />
        </React.Fragment>
    );
}
