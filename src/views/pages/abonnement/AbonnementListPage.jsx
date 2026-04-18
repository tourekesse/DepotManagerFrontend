import * as React from "react";
import {
  Box,
  Button,
  Typography,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Paper,
  Card,
  CardContent,
  Grid,
  IconButton,
  Tooltip
} from "@mui/material";
import {
  DataGrid,
  GridActionsCellItem,
  GridToolbarContainer,
  GridToolbarFilterButton
} from "@mui/x-data-grid";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PaymentIcon from "@mui/icons-material/Payment";
import PersonIcon from "@mui/icons-material/Person";
import PageContainer from "../../../crud-dashboard/components/PageContainer";
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";
import { publicApi } from "../../../api/axios";

const formatF = (n) => {
  if (n === null || n === undefined) return "0 F";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "0 F";
  return num.toLocaleString("fr-CI", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " F";
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("fr-CI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
};

export default function AbonnementListPage() {
  const notifications = useNotifications();
  
  // États
  const [abonnements, setAbonnements] = React.useState([]);
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  // Charger les données
  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Charger tous les abonnements
      const res = await publicApi.get("/api/abonnements");
      setAbonnements(res.data || []);
      
      // Calculer les stats
      const data = res.data || [];
      const stats = {
        total: data.length,
        actifs: data.filter(a => a.statut === "ACTIF").length,
        enAttente: data.filter(a => a.statut === "EN_ATTENTE" || a.statut === "EN_COURS").length,
        expires: data.filter(a => a.statut === "EXPIRE").length,
        totalRevenus: data
          .filter(a => a.statut === "ACTIF" || a.statut === "COMPLETED")
          .reduce((sum, a) => sum + (a.montant || 0), 0)
      };
      setStats(stats);
    } catch (err) {
      setError("Erreur lors du chargement des abonnements");
      notifications.show("Erreur lors du chargement", { severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [notifications]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Colonnes DataGrid
  const columns = [
    {
      field: "id",
      headerName: "ID",
      width: 70,
      type: "number"
    },
    {
      field: "clientRaisonsociale",
      headerName: "Client",
      flex: 1,
      minWidth: 150,
      valueGetter: (params) => params.value || "-"
    },
    {
      field: "type",
      headerName: "Type",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value === "BAR" ? "🍺 Bar" : "🎵 Maquis"}
          size="small"
          color={params.value === "BAR" ? "success" : "warning"}
          variant="outlined"
        />
      )
    },
    {
      field: "montant",
      headerName: "Montant",
      width: 120,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: 700 }}>
          {formatF(params.value)}
        </Typography>
      )
    },
    {
      field: "statut",
      headerName: "Statut",
      width: 130,
      renderCell: (params) => {
        const statusConfig = {
          ACTIF: { color: "success", icon: <CheckCircleIcon fontSize="small" />, label: "Actif" },
          EN_ATTENTE: { color: "default", icon: <ScheduleIcon fontSize="small" />, label: "En attente" },
          EN_COURS: { color: "info", icon: <PaymentIcon fontSize="small" />, label: "En cours" },
          EXPIRE: { color: "warning", icon: <ScheduleIcon fontSize="small" />, label: "Expiré" },
          ANNULE: { color: "error", icon: <CancelIcon fontSize="small" />, label: "Annulé" }
        };
        const config = statusConfig[params.value] || statusConfig.EN_ATTENTE;
        return (
          <Chip
            icon={config.icon}
            label={config.label}
            size="small"
            color={config.color}
            variant={params.value === "ACTIF" ? "filled" : "outlined"}
          />
        );
      }
    },
    {
      field: "dateDebut",
      headerName: "Début",
      width: 100,
      valueFormatter: (params) => formatDate(params.value)
    },
    {
      field: "dateFin",
      headerName: "Fin",
      width: 100,
      valueFormatter: (params) => formatDate(params.value)
    },
    {
      field: "telephonePaiement",
      headerName: "Téléphone",
      width: 130
    },
    {
      field: "createdAt",
      headerName: "Créé le",
      width: 120,
      valueFormatter: (params) => {
        if (!params.value) return "-";
        return new Date(params.value).toLocaleDateString("fr-CI");
      }
    }
  ];

  return (
    <PageContainer title="Gestion des Abonnements">
      <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}

        {/* Cartes de statistiques */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: "#e3f2fd" }}>
              <CardContent sx={{ textAlign: "center" }}>
                <Typography variant="h4" sx={{ fontWeight: 900, color: "#1976d2" }}>
                  {stats?.total || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total abonnements
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: "#e8f5e9" }}>
              <CardContent sx={{ textAlign: "center" }}>
                <Typography variant="h4" sx={{ fontWeight: 900, color: "#4caf50" }}>
                  {stats?.actifs || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Abonnements actifs
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: "#fff3e0" }}>
              <CardContent sx={{ textAlign: "center" }}>
                <Typography variant="h4" sx={{ fontWeight: 900, color: "#ff9800" }}>
                  {stats?.enAttente || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  En attente
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: "#f3e5f5" }}>
              <CardContent sx={{ textAlign: "center" }}>
                <Typography variant="h4" sx={{ fontWeight: 900, color: "#9c27b0" }}>
                  {formatF(stats?.totalRevenus || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Revenus totaux
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Toolbar */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
          >
            Rafraîchir
          </Button>
          
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
            {abonnements.length} abonnement(s) trouvé(s)
          </Typography>
        </Stack>

        {/* DataGrid */}
        <Paper sx={{ height: 600, width: "100%" }}>
          <DataGrid
            rows={abonnements}
            columns={columns}
            loading={loading}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } }
            }}
            slots={{
              toolbar: GridToolbarContainer
            }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500 }
              }
            }}
            sx={{
              "& .MuiDataGrid-columnHeader": { fontWeight: 700 },
              "& .MuiDataGrid-cell": { fontSize: "0.9rem" }
            }}
          />
        </Paper>
      </Stack>
    </PageContainer>
  );
}
