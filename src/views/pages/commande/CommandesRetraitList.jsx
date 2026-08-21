import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Alert,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Typography,
  Divider,
  Grid,
  Badge,
  Chip,
  Avatar,
} from "@mui/material";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PersonIcon from "@mui/icons-material/Person";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../../crud-dashboard/components/PageContainer";
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";
import { privateApi } from "../../../api/axios";
import GererCasiersModal from "../../../components/GererCasiersModal";
import AssignerLivreurModal from "../../../components/AssignerLivreurModal";
import { formatDateCI } from "../../../utils/dateUtils";
import { useUser } from "../../../context/UserContext";
import { formatCurrency } from "../../../utils/currencyUtils";
import ConvertirCommandeModal from "../../../components/ConvertirCommandeModal";

export default function CommandesRetraitList() {
  const notifications = useNotifications();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { activePointDeVente } = useUser();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    // Récupérer le point de vente actif depuis le contexte ou localStorage
    let pvId = activePointDeVente?.id;
    
    if (!pvId) {
      // Fallback sur activePV du localStorage
      const storedPV = localStorage.getItem('activePV');
      if (storedPV) {
        try {
          pvId = JSON.parse(storedPV).id;
        } catch (e) {
          console.error("Erreur parsing activePV", e);
        }
      }
    }
    
    if (!pvId) {
      setRows([]);
      setLoading(false);
      notifications.show("Aucun point de vente actif trouvé", { severity: "warning" });
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const res = await privateApi.get(
        `/api/commandes?pointDeVenteId=${pvId}&statut=EN_ATTENTE`
      );
      console.log("Réponse API /api/commandes:", res.data);
      if (res.data && res.data.length > 0) {
        console.log("Premier item:", res.data[0]);
      }
      setRows(res.data || []);
    } catch (e) {
      setError("Impossible de charger les commandes en attente.");
      notifications.show("Erreur de connexion au serveur", { severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [notifications, activePointDeVente]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [stepperOpen, setStepperOpen] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [ventesCasiers, setVentesCasiers] = useState([]);
  const [clientNomForCasiers, setClientNomForCasiers] = useState('');
  const [convertirModalOpen, setConvertirModalOpen] = useState(false);
  const [commandeToConvert, setCommandeToConvert] = useState(null);
  const [livreurModalOpen, setLivreurModalOpen] = useState(false);
  const [commandeForLivreur, setCommandeForLivreur] = useState(null);

  const handleLivrer = async (row) => {
    // Récupérer les casiers à récupérer pour ce client
    try {
      const res = await privateApi.get(`/api/clients/${row.clientId}/casiers-a-recuperer`);
      const data = res.data || [];
      setVentesCasiers(data);
      
      // Préparer la vente pour le modal
      const vente = data.length > 0 ? {
        venteId: data[0].venteId,
        dateVente: data[0].dateVente,
        mtEmballage: data[0].mtEmballage
      } : null;
      
      setSelectedCommande({
        ...row,
        vente: vente
      });
      setClientNomForCasiers(row.clientNom || 'Client');
      setStepperOpen(true);
    } catch (err) {
      console.error("Erreur chargement casiers:", err);
      notifications.show("Impossible de charger les casiers à récupérer", { severity: "error" });
    }
  };

  const handleStepperClose = () => {
    setStepperOpen(false);
    setSelectedCommande(null);
    setVentesCasiers([]);
  };

  const handleValider = (row) => {
    setCommandeToConvert(row);
    setConvertirModalOpen(true);
  };

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

  const handleConversionSuccess = () => {
    notifications.show("Commande convertie en vente avec succès", { severity: "success" });
    loadData();
  };

  const handleStepperValidate = async () => {
    try {
      // Recharger les données après validation
      await loadData();
      handleStepperClose();
      notifications.show("Casiers gérés avec succès", { severity: "success" });
    } catch (err) {
      console.error("Erreur validation:", err);
      notifications.show("Erreur lors de la validation", { severity: "error" });
    }
  };

  const columns = [
    { 
      field: "id", 
      headerName: "ID", 
      width: 70,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: "bold", color: "primary.main" }}>
          #{params.row.id}
        </Typography>
      ),
    },
    {
      field: "clientNom",
      headerName: "Client",
      width: 180,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.light" }}>
            <PersonIcon />
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {params.row.clientNom || params.row.nomClient}
          </Typography>
        </Stack>
      ),
    },
    {
      field: "dateCommande",
      headerName: "Date",
      width: 150,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <ScheduleIcon fontSize="small" color="action" />
          <Typography variant="body2">
            {formatDateCI(params.row.dateCommande)}
          </Typography>
        </Stack>
      ),
    },
    {
      field: "montantTotal",
      headerName: "Montant",
      width: 140,
      renderCell: (params) => {
        const montant = params.row.montantTotal || 0;
        return (
          <Typography variant="body2" sx={{ fontWeight: "bold", color: "success.main" }}>
            {formatCurrency(parseFloat(montant))}
          </Typography>
        );
      },
    },
    {
      field: "modeRetrait",
      headerName: "Mode",
      width: 130,
      renderCell: (params) => {
        const mode = params.row.modeRetrait || "";
        if (mode === "LIVRAISON") {
          // Vérifier si un livreur est assigné
          const hasLivreur = params.row.livreurId || params.row.livreur?.id;
          if (hasLivreur) {
            return (
              <Chip 
                label="Assigné" 
                size="small" 
                color="success" 
                sx={{ fontWeight: "bold" }}
                aria-label="Commande assignée à un livreur"
              />
            );
          }
          return <Chip label="À livrer" size="small" color="warning" sx={{ fontWeight: "bold" }} />;
        }
        if (mode === "RETRAIT") {
          return <Chip label="À retirer" size="small" color="success" sx={{ fontWeight: "bold" }} />;
        }
        return <Typography variant="body2">{mode}</Typography>;
      },
    },
    {
      field: "statut",
      headerName: "Statut",
      width: 120,
      renderCell: (params) => {
        const statut = params.row.statut || "";
        const isEnAttente = statut === "EN_ATTENTE";
        return (
          <Badge color={isEnAttente ? "warning" : "secondary"} sx={{ "& .MuiBadge-badge": { fontWeight: "bold" } }}>
            {isEnAttente ? "En attente" : statut}
          </Badge>
        );
      },
    },
    {
      field: "actions",
      type: "actions",
      width: 140,
      getActions: ({ row }) => [
        <Tooltip title="Valider la commande" arrow>
          <GridActionsCellItem
            icon={<CheckCircleIcon />}
            label="Valider"
            onClick={() => handleValider(row)}
            color="success"
            showInMenu={false}
            sx={{ borderRadius: 1 }}
          />
        </Tooltip>,
        <Tooltip title="Assigner un livreur" arrow>
          <GridActionsCellItem
            icon={<LocalShippingIcon />}
            label="Assigner un livreur"
            onClick={() => handleAssignerLivreur(row)}
            color="primary"
            showInMenu={false}
            sx={{ borderRadius: 1 }}
          />
        </Tooltip>,
      ],
    },
  ];

  const renderMobileView = () => {
    return (
      <Stack spacing={2} sx={{ mt: 2 }}>
        {rows.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <ShoppingCartIcon sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" color="textSecondary">
              Aucune commande en attente
            </Typography>
          </Box>
        ) : (
          rows.map((row) => {
            const isLivraison = row.modeRetrait === "LIVRAISON";
            return (
              <Card 
                key={row.id} 
                sx={{ 
                  borderRadius: 3, 
                  boxShadow: 2,
                  borderLeft: `4px solid ${isLivraison ? '#ff9800' : '#4caf50'}`,
                  transition: "all 0.2s ease",
                  "&:hover": { boxShadow: 4 },
                }}
              >
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.light" }}>
                        <PersonIcon />
                      </Avatar>
                      <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                        {row.clientNom || row.nomClient}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <IconButton 
                        size="small" 
                        color="success" 
                        onClick={() => handleValider(row)}
                        sx={{ borderRadius: 1.5 }}
                      >
                        <CheckCircleIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="primary" 
                        onClick={() => handleAssignerLivreur(row)}
                        sx={{ borderRadius: 1.5 }}
                      >
                        <LocalShippingIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                  
                  <Grid container spacing={1} sx={{ mb: 1 }}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">
                        ID Commande
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: "bold", color: "primary.main" }}>
                        #{row.id}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: "right" }}>
                      <Typography variant="caption" color="textSecondary">
                        Montant
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: "bold", color: "success.main" }}>
                        {formatCurrency(parseFloat(row.montantTotal || row.total || 0))}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Divider sx={{ my: 1.5 }} />
                  
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">
                        Date
                      </Typography>
                      <Typography variant="body2">
                        {formatDateCI(row.dateCommande)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: "right" }}>
                      <Typography variant="caption" color="textSecondary">
                        Mode
                      </Typography>
                      <Chip 
                        label={isLivraison ? "À livrer" : "À retirer"} 
                        size="small" 
                        color={isLivraison ? "warning" : "success"}
                        sx={{ fontWeight: "bold", mt: 0.3 }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            );
          })
        )}
      </Stack>
    );
  };

  return (
    <>
      <PageContainer
        title={
          <Stack spacing={0.2} direction="row" alignItems="center">
            <Badge color="warning" sx={{ "& .MuiBadge-badge": { fontWeight: "bold" } }}>
              {rows.length > 0 && rows.length}
            </Badge>
            <ShoppingCartIcon sx={{ fontSize: 22 }} />
            <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: "bold" }}>
              Commandes en attente de validation
            </Typography>
          </Stack>
        }
      >
        <Box sx={{ width: "100%", mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {isMobile ? (
            renderMobileView()
          ) : (
            <Box sx={{ height: 650, width: "100%" }}>
              <DataGrid
                rows={rows}
                columns={columns}
                loading={loading}
                disableRowSelectionOnClick
                pageSizeOptions={[10, 25, 50]}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                getRowClassName={(params) => {
                  const mode = params.row.modeRetrait || "";
                  if (mode === "LIVRAISON") return "row-a-livrer";
                  if (mode === "RETRAIT") return "row-a-retirer";
                  return "";
                }}
                sx={{
                  border: "none",
                  boxShadow: 3,
                  borderRadius: 3,
                  bgcolor: "background.paper",
                  "& .MuiDataGrid-columnHeaders": { 
                    backgroundColor: "#e3f2fd",
                    fontWeight: "bold",
                  },
                  "& .MuiDataGrid-columnHeader": {
                    fontWeight: "bold",
                  },
                  "& .row-a-livrer": {
                    bgcolor: "#fff3e0 !important",
                    borderLeft: "4px solid #ff9800 !important",
                  },
                  "& .row-a-retirer": {
                    bgcolor: "#e8f5e9 !important",
                    borderLeft: "4px solid #4caf50 !important",
                  },
                  "& .MuiDataGrid-row": {
                    transition: "all 0.2s ease",
                    "&:hover": {
                      transform: "translateX(4px)",
                      boxShadow: 2,
                    },
                  },
                }}
              />
            </Box>
          )}
        </Box>
      </PageContainer>
      <GererCasiersModal
        open={stepperOpen}
        onClose={handleStepperClose}
        vente={selectedCommande?.vente}
        onValidate={handleStepperValidate}
        clientNom={clientNomForCasiers}
        ventesCasiers={ventesCasiers}
      />
      <ConvertirCommandeModal
        open={convertirModalOpen}
        onClose={() => setConvertirModalOpen(false)}
        commande={commandeToConvert}
        onSuccess={handleConversionSuccess}
      />
      <AssignerLivreurModal
        open={livreurModalOpen}
        onClose={handleLivreurModalClose}
        commandeId={commandeForLivreur?.id}
        onSuccess={handleLivreurAssignationSuccess}
      />
    </>
  );
}
