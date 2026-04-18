import React, { useEffect, useState } from "react";
import { Box, Typography, Paper, Grid, CircularProgress } from "@mui/material";
import {
  TrendingUp,
  ShoppingCart,
  Inventory,
  People,
  Warning,
  Assessment,
  Inventory2,
  LocalShipping,
} from "@mui/icons-material";
import { LineChart } from "@mui/x-charts/LineChart";
import { privateApi } from "../../api/axios";
import { getUserRole, ROLES } from "../../config/roleConfig";

export default function DashboardHome() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const userRole = getUserRole();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Choisir l'endpoint selon le rôle
        const endpoint = userRole === ROLES.CLIENT_BAR 
          ? "/api/dashboard/stats/client" 
          : "/api/dashboard/stats";
        
        const response = await privateApi.get(endpoint);
        setStats(response.data);
      } catch (error) {
        console.error("Erreur chargement stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userRole]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Aucune";
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const ventes7JoursLabels = stats?.ventes7JoursLabels || [];
  const ventes7JoursTotals = (stats?.ventes7JoursTotals || []).map((value) =>
    Number(value || 0)
  );
  const ventes7JoursCounts = (stats?.ventes7JoursCounts || []).map((value) =>
    Number(value || 0)
  );
  const totalVentes7Jours = ventes7JoursTotals.reduce(
    (sum, value) => sum + value,
    0
  );
  const totalTransactions7Jours = ventes7JoursCounts.reduce(
    (sum, value) => sum + value,
    0
  );

  // KPI Cards pour ADMIN/GERANT_DEPOT
  const adminKpiCards = [
    {
      title: "Ventes du jour",
      value: formatCurrency(stats?.ventesJour),
      icon: <TrendingUp sx={{ fontSize: 40, color: "#4caf50" }} />,
      color: "#e8f5e9",
      subtitle: `Nombre de ventes : ${stats?.ventesAujourdhui || 0}`,
    },
    {
      title: "Ventes du mois",
      value: formatCurrency(stats?.ventesMois),
      icon: <Assessment sx={{ fontSize: 40, color: "#2196f3" }} />,
      color: "#e3f2fd",
    },
    {
      title: "Commandes en attente",
      value: stats?.commandesEnAttente || 0,
      icon: <ShoppingCart sx={{ fontSize: 40, color: "#ff9800" }} />,
      color: "#fff3e0",
    },
    {
      title: "Stock critique",
      value: stats?.produitsStockCritique || 0,
      icon: <Warning sx={{ fontSize: 40, color: "#f44336" }} />,
      color: "#ffebee",
      subtitle: `/${stats?.totalProduits || 0} produits`,
    },
    {
      title: "Total produits",
      value: stats?.totalProduits || 0,
      icon: <Inventory sx={{ fontSize: 40, color: "#9c27b0" }} />,
      color: "#f3e5f5",
    },
    {
      title: "Clients actifs",
      value: stats?.totalClients || 0,
      icon: <People sx={{ fontSize: 40, color: "#00bcd4" }} />,
      color: "#e0f7fa",
    },
  ];

  // KPI Cards pour CLIENT_BAR
  const clientKpiCards = [
    {
      title: "Achats du mois",
      value: formatCurrency(stats?.achatsMois),
      icon: <TrendingUp sx={{ fontSize: 40, color: "#4caf50" }} />,
      color: "#e8f5e9",
    },
    {
      title: "Commandes en cours",
      value: stats?.commandesEnCours || 0,
      icon: <LocalShipping sx={{ fontSize: 40, color: "#ff9800" }} />,
      color: "#fff3e0",
      subtitle: "En attente/livraison",
    },
    {
      title: "Total commandes",
      value: stats?.totalCommandes || 0,
      icon: <ShoppingCart sx={{ fontSize: 40, color: "#2196f3" }} />,
      color: "#e3f2fd",
    },
    {
      title: "Casiers à récupérer",
      value: stats?.casiersARecuperer || 0,
      icon: <Inventory2 sx={{ fontSize: 40, color: "#9c27b0" }} />,
      color: "#f3e5f5",
    },
    {
      title: "Dernière commande",
      value: formatDate(stats?.derniereCommandeDate),
      icon: <Assessment sx={{ fontSize: 40, color: "#00bcd4" }} />,
      color: "#e0f7fa",
      subtitle: stats?.derniereCommandeStatut || "Aucune",
    },
  ];

  const kpiCards = userRole === ROLES.CLIENT_BAR ? clientKpiCards : adminKpiCards;

  return (
    <Box sx={{ p: 3 }}>
      {/* ✅ TITRE */}
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        {userRole === ROLES.CLIENT_BAR ? "Mon tableau de bord" : "Tableau de bord"}
      </Typography>

      {/* ✅ SECTION KPI */}
      <Grid container spacing={3}>
        {kpiCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Paper
              sx={{
                p: 3,
                height: "100%",
                borderRadius: 2,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                backgroundColor: card.color,
                transition: "transform 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                {card.icon}
                <Typography
                  variant="subtitle2"
                  sx={{ ml: 2, opacity: 0.8, fontWeight: 500 }}
                >
                  {card.title}
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                {card.value}
              </Typography>
              {card.subtitle && (
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {card.subtitle}
                </Typography>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ✅ GRAPHIQUE 7 DERNIERS JOURS (Admin seulement) */}
      {userRole !== ROLES.CLIENT_BAR && ventes7JoursLabels.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 2,
              backgroundColor: "#ffffff",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Assessment sx={{ fontSize: 24, color: "#2e7d32", mr: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Ventes - 7 derniers jours
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 2,
                mb: 2,
              }}
            >
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Total 7 jours
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {formatCurrency(totalVentes7Jours)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Nombre de ventes
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {totalTransactions7Jours}
                </Typography>
              </Box>
            </Box>
            <LineChart
              height={280}
              xAxis={[
                {
                  scaleType: "point",
                  data: ventes7JoursLabels,
                  tickLabelStyle: { fontSize: 12 },
                },
              ]}
              yAxis={[{ width: 60 }]}
              series={[
                {
                  data: ventes7JoursTotals,
                  label: "Total des ventes",
                  area: true,
                  curve: "linear",
                  showMark: true,
                  color: "#2e7d32",
                },
              ]}
            />
          </Paper>
        </Box>
      )}

      {/* ✅ ALERTES SI STOCK CRITIQUE (Admin seulement) */}
      {userRole !== ROLES.CLIENT_BAR && stats?.produitsStockCritique > 0 && (
        <Box sx={{ mt: 4 }}>
          <Paper
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: "#fff3e0",
              borderLeft: "4px solid #ff9800",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#e65100" }}>
              ⚠️ Attention : {stats.produitsStockCritique} produit(s) en stock
              critique
            </Typography>
            <Typography sx={{ mt: 1, color: "#ef6c00" }}>
              Certains produits ont atteint le seuil minimum. Pensez à réapprovisionner.
            </Typography>
          </Paper>
        </Box>
      )}

      {/* ✅ MESSAGE SI COMMANDES EN COURS (Client seulement) */}
      {userRole === ROLES.CLIENT_BAR && stats?.commandesEnCours > 0 && (
        <Box sx={{ mt: 4 }}>
          <Paper
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: "#e3f2fd",
              borderLeft: "4px solid #2196f3",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#1565c0" }}>
              📦 Vous avez {stats.commandesEnCours} commande(s) en cours
            </Typography>
            <Typography sx={{ mt: 1, color: "#1976d2" }}>
              Consultez l'historique pour suivre vos livraisons.
            </Typography>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
