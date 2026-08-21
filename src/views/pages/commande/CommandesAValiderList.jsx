import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PersonIcon from "@mui/icons-material/Person";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PageContainer from "../../../crud-dashboard/components/PageContainer";
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";
import { privateApi } from "../../../api/axios";
import AssignerLivreurModal from "../../../components/AssignerLivreurModal";
import ConvertirCommandeModal from "../../../components/ConvertirCommandeModal";
import { formatDateCI } from "../../../utils/dateUtils";
import { useUser } from "../../../context/UserContext";
import { formatCurrency } from "../../../utils/currencyUtils";

const CREE_PAR_CLIENT_BAR = "CLIENT_BAR";

export default function CommandesAValiderList() {
  const notifications = useNotifications();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { activePointDeVente } = useUser();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [convertirModalOpen, setConvertirModalOpen] = useState(false);
  const [commandeToConvert, setCommandeToConvert] = useState(null);
  const [livreurModalOpen, setLivreurModalOpen] = useState(false);
  const [commandeForLivreur, setCommandeForLivreur] = useState(null);

  const resolvePvId = useCallback(() => {
    if (activePointDeVente?.id) return activePointDeVente.id;
    try {
      const stored = localStorage.getItem("activePV");
      if (stored) return JSON.parse(stored).id;
    } catch {
      /* ignore */
    }
    return null;
  }, [activePointDeVente]);

  const loadData = useCallback(async () => {
    const pvId = resolvePvId();
    if (!pvId) {
      setRows([]);
      setLoading(false);
      setError("Aucun point de vente actif. Sélectionnez un dépôt dans le menu.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await privateApi.get("/api/commandes", {
        params: {
          pointDeVenteId: pvId,
          statut: "EN_ATTENTE",
          creePar: CREE_PAR_CLIENT_BAR,
        },
      });
      setRows(res.data || []);
    } catch (e) {
      console.error("Erreur chargement commandes à valider:", e);
      setError("Impossible de charger les commandes clients bar en attente.");
      notifications.show("Erreur de connexion au serveur", { severity: "error" });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [notifications, resolvePvId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleValider = (row) => {
    setCommandeToConvert(row);
    setConvertirModalOpen(true);
  };

  const handleAssignerLivreur = (row) => {
    setCommandeForLivreur(row);
    setLivreurModalOpen(true);
  };

  const handleConversionSuccess = () => {
    notifications.show("Commande convertie en vente avec succès", { severity: "success" });
    loadData();
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
      headerName: "Client bar",
      width: 180,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.light" }}>
            <PersonIcon />
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {params.row.clientNom || params.row.nomClient || "—"}
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
          <Typography variant="body2">{formatDateCI(params.row.dateCommande)}</Typography>
        </Stack>
      ),
    },
    {
      field: "montantTotal",
      headerName: "Montant",
      width: 140,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: "bold", color: "success.main" }}>
          {formatCurrency(parseFloat(params.row.montantTotal || 0))}
        </Typography>
      ),
    },
    {
      field: "modeRetrait",
      headerName: "Mode",
      width: 130,
      renderCell: (params) => {
        const mode = params.row.modeRetrait || "";
        if (mode === "LIVRAISON") {
          const hasLivreur = params.row.livreurId || params.row.livreur?.id;
          return (
            <Chip
              label={hasLivreur ? "Assigné" : "À livrer"}
              size="small"
              color={hasLivreur ? "success" : "warning"}
              sx={{ fontWeight: "bold" }}
            />
          );
        }
        if (mode === "RETRAIT") {
          return <Chip label="À retirer" size="small" color="success" sx={{ fontWeight: "bold" }} />;
        }
        return <Typography variant="body2">{mode || "—"}</Typography>;
      },
    },
    {
      field: "creePar",
      headerName: "Créée par",
      width: 120,
      renderCell: (params) => (
        <Chip label={params.value || CREE_PAR_CLIENT_BAR} size="small" variant="outlined" />
      ),
    },
    {
      field: "actions",
      type: "actions",
      width: 140,
      getActions: ({ row }) => [
        <Tooltip title="Valider la commande" arrow key="valider">
          <GridActionsCellItem
            icon={<CheckCircleIcon />}
            label="Valider"
            onClick={() => handleValider(row)}
            color="success"
          />
        </Tooltip>,
        <Tooltip title="Assigner un livreur" arrow key="livreur">
          <GridActionsCellItem
            icon={<LocalShippingIcon />}
            label="Assigner un livreur"
            onClick={() => handleAssignerLivreur(row)}
            color="primary"
          />
        </Tooltip>,
      ],
    },
  ];

  const renderMobileView = () => (
    <Stack spacing={2} sx={{ mt: 2 }}>
      {rows.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <ShoppingCartIcon sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="textSecondary">
            Aucune commande client bar en attente
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
                borderLeft: `4px solid ${isLivraison ? "#ff9800" : "#4caf50"}`,
              }}
            >
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.light" }}>
                      <PersonIcon />
                    </Avatar>
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                      {row.clientNom || "Client"}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <IconButton size="small" color="success" onClick={() => handleValider(row)}>
                      <CheckCircleIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="primary" onClick={() => handleAssignerLivreur(row)}>
                      <LocalShippingIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">
                      Commande
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
                      {formatCurrency(parseFloat(row.montantTotal || 0))}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" color="textSecondary">
                      {formatDateCI(row.dateCommande)} · {row.modeRetrait} · {row.creePar || CREE_PAR_CLIENT_BAR}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          );
        })
      )}
    </Stack>
  );

  return (
    <>
      <PageContainer
        title={
          <Stack spacing={0.2} direction="row" alignItems="center">
            <Badge color="warning" badgeContent={rows.length > 0 ? rows.length : null}>
              <ShoppingCartIcon sx={{ fontSize: 22 }} />
            </Badge>
            <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: "bold" }}>
              Commandes à valider (clients bar)
            </Typography>
          </Stack>
        }
        actions={
          <Tooltip title="Actualiser">
            <IconButton onClick={loadData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        }
      >
        <Box sx={{ width: "100%", mt: 2 }}>
          {error && (
            <Alert severity="warning" sx={{ mb: 2 }}>
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
                localeText={{ noRowsLabel: "Aucune commande client bar en attente" }}
                getRowId={(row) => row.id}
                sx={{
                  border: "none",
                  boxShadow: 3,
                  borderRadius: 3,
                  "& .MuiDataGrid-columnHeaders": {
                    backgroundColor: "#e3f2fd",
                    fontWeight: "bold",
                  },
                }}
              />
            </Box>
          )}
        </Box>
      </PageContainer>

      <ConvertirCommandeModal
        open={convertirModalOpen}
        onClose={() => setConvertirModalOpen(false)}
        commande={commandeToConvert}
        onSuccess={handleConversionSuccess}
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
          setLivreurModalOpen(false);
          setCommandeForLivreur(null);
          notifications.show("Livreur assigné avec succès", { severity: "success" });
        }}
      />
    </>
  );
}