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
} from "@mui/material";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../../crud-dashboard/components/PageContainer";
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";
import { privateApi } from "../../../api/axios";
import GererCasiersModal from "../../../components/GererCasiersModal";
import { formatDateCI } from "../../../utils/dateUtils";
import { useUser } from "../../../context/UserContext";
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
        `/api/commandes?pointDeVenteId=${pvId}&statut=ENREGISTREE`
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
    { field: "id", headerName: "ID", width: 80 },
    {
      field: "clientNom",
      headerName: "Client",
      width: 180,
    },
    {
      field: "dateCommande",
      headerName: "Date",
      width: 140,
      renderCell: (params) => formatDateCI(params.row.dateCommande),
    },
    {
      field: "montantTotal",
      headerName: "Montant",
      width: 130,
      renderCell: (params) => {
        const montant = params.row.montantTotal || 0;
        return montant ? parseFloat(montant).toLocaleString("fr-FR") + " FCFA" : "0 FCFA";
      },
    },
    {
      field: "modeRetrait",
      headerName: "Mode",
      width: 140,
      renderCell: (params) => {
        const mode = params.row.modeRetrait || "";
        if (mode === "LIVRAISON") return "À livrer";
        if (mode === "RETRAIT") return "À retirer";
        return mode;
      },
    },
    {
      field: "statut",
      headerName: "Statut",
      width: 120,
    },
    {
      field: "actions",
      type: "actions",
      width: 150,
      getActions: ({ row }) => [
        <GridActionsCellItem
          icon={<CheckCircleIcon />}
          label="Valider"
          onClick={() => handleValider(row)}
          color="success"
          showInMenu={false}
        />,
        <GridActionsCellItem
          icon={<LocalShippingIcon />}
          label="Assigner livreur"
          onClick={() => handleLivrer(row)}
          color="primary"
          showInMenu={false}
        />,
      ],
    },
  ];

  const renderMobileView = () => {
    return (
      <Stack spacing={2} sx={{ mt: 2 }}>
        {rows.map((row) => (
          <Card key={row.id} sx={{ borderRadius: 2, boxShadow: 1 }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                  Commande #{row.id}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <IconButton size="small" color="success" onClick={() => handleValider(row)}>
                    <CheckCircleIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="primary" onClick={() => handleLivrer(row)}>
                    <LocalShippingIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Client
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {row.clientNom || row.nomClient}
                  </Typography>
                </Grid>
                <Grid item xs={6} sx={{ textAlign: "right" }}>
                  <Typography variant="caption" color="textSecondary">
                    Montant
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {parseFloat(row.montantTotal || row.total || 0).toLocaleString("fr-FR")} FCFA
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Date
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatDateCI(row.dateCommande)}
                  </Typography>
                </Grid>
                <Grid item xs={6} sx={{ textAlign: "right" }}>
                  <Typography variant="caption" color="textSecondary">
                    Mode
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {row.modeRetrait === "LIVRAISON" ? "À livrer" : "À retirer"}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">
                    Statut
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {row.statut}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  };

  return (
    <>
      <PageContainer
        title={
          <Stack spacing={0.2} direction="row" alignItems="center">
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
                  boxShadow: 1,
                  borderRadius: 2,
                  bgcolor: "background.paper",
                  "& .MuiDataGrid-columnHeaders": { backgroundColor: "#f8f9fa" },
                  "& .row-a-livrer": {
                    bgcolor: "#fff3cd !important",
                    borderLeft: "4px solid #ff9800 !important",
                  },
                  "& .row-a-retirer": {
                    bgcolor: "#e8f5e9 !important",
                    borderLeft: "4px solid #4caf50 !important",
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
    </>
  );
}
