import React, { useState, useEffect } from "react";
import { Box, Typography, Paper, CircularProgress, Alert, Button, IconButton } from "@mui/material";
import { TrendingUp, ShoppingCart, AlertTriangle, Package, Users, AttachMoney, RefreshCw } from "lucide-react";
import { getActivePointDeVenteId } from "../../../utils/pdv";
import { publicApi } from "../../../api/axios";

const formatF = (n) => `${Number(n || 0).toLocaleString("fr-FR")} FCFA`;

export default function DashboardHome() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token d'authentification manquant");
      }

      console.log("Dashboard - Token:", token ? "Présent" : "Manquant");

      // ✅ Utiliser publicApi qui lit déjà l'URL du backend depuis la DB
      const endpoints = [
        { key: 'ventesJour', url: '/api/dashboard/ventes-jour' },
        { key: 'ventesMois', url: '/api/dashboard/ventes-mois' },
        { key: 'commandesEnAttente', url: '/api/dashboard/commandes-attente' },
        { key: 'produitsStockCritique', url: '/api/dashboard/stock-critique' },
        { key: 'totalProduits', url: '/api/dashboard/total-produits' },
        { key: 'totalClients', url: '/api/dashboard/clients-actifs' }
      ];

      const stats = {};
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Dashboard - Appel de ${endpoint.url}`);
          const response = await publicApi.get(endpoint.url);

          const data = response.data;
          console.log(`Dashboard - Données ${endpoint.key}:`, data);
          
          // Extraire la bonne valeur selon l'endpoint
          if (endpoint.key === 'ventesJour') {
            stats.ventesJour = data.ventesJour || 0;
          } else if (endpoint.key === 'ventesMois') {
            stats.ventesMois = data.total || 0;
          } else {
            stats[endpoint.key] = data.nombre || 0;
          }
        } catch (err) {
          console.error(`Dashboard - Erreur ${endpoint.key}:`, err);
          stats[endpoint.key] = 0;
        }
      }

      console.log("Dashboard - Stats finales:", stats);
      setStats(stats);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error("Erreur chargement dashboard:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    
    // Rafraîchir les données toutes les 30 secondes
    const interval = setInterval(fetchDashboardStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const kpiCards = [
    {
      title: "Ventes du jour",
      value: stats?.ventesJour ? formatF(stats.ventesJour) : "0 FCFA",
      icon: <TrendingUp size={24} />,
      color: "#4caf50",
      bgColor: "#e8f5e8"
    },
    {
      title: "Ventes du mois",
      value: stats?.ventesMois ? formatF(stats.ventesMois) : "0 FCFA",
      icon: <AttachMoney size={24} />,
      color: "#2196f3",
      bgColor: "#e3f2fd"
    },
    {
      title: "Commandes en attente",
      value: stats?.commandesEnAttente || 0,
      icon: <ShoppingCart size={24} />,
      color: "#ff9800",
      bgColor: "#fff3e0"
    },
    {
      title: "Stock critique",
      value: stats?.produitsStockCritique || 0,
      icon: <AlertTriangle size={24} />,
      color: "#f44336",
      bgColor: "#ffebee"
    },
    {
      title: "Total produits",
      value: stats?.totalProduits || 0,
      icon: <Package size={24} />,
      color: "#9c27b0",
      bgColor: "#f3e5f5"
    },
    {
      title: "Clients actifs",
      value: stats?.totalClients || 0,
      icon: <Users size={24} />,
      color: "#00bcd4",
      bgColor: "#e0f7fa"
    }
  ];

  if (loading) {
    return (
      <Box sx={{ p: 3, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress size={48} sx={{ mb: 2, color: "#1976d2" }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: "#666" }}>
            Chargement du tableau de bord...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={fetchDashboardStats}
              disabled={loading}
            >
              Réessayer
            </Button>
          }
        >
          Erreur de chargement: {error}
        </Alert>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
          Tableau de bord
        </Typography>
        
        {/* Afficher les KPI avec valeurs zéro en cas d'erreur */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(3, 1fr)"
            },
            gap: 2,
            mb: 4
          }}
        >
          {kpiCards.map((kpi, index) => (
            <Paper
              key={index}
              sx={{
                p: 2.5,
                borderRadius: 2,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                border: "1px solid rgba(244, 67, 54, 0.3)",
                opacity: 0.7
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: "#ffebee",
                    color: "#f44336",
                    mr: 1.5
                  }}
                >
                  {kpi.icon}
                </Box>
                <Typography variant="subtitle2" sx={{ opacity: 0.7, fontWeight: 500 }}>
                  {kpi.title}
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: "#666" }}>
                -- FCFA
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* ✅ TITRE AVEC BOUTON RAFRAÎCHIR */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Tableau de bord
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {lastUpdate && (
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Dernière mise à jour: {lastUpdate.toLocaleTimeString()}
            </Typography>
          )}
          <IconButton 
            onClick={fetchDashboardStats} 
            disabled={loading}
            sx={{ 
              bgcolor: "#1976d2", 
              color: "white", 
              "&:hover": { bgcolor: "#1565c0" },
              "&:disabled": { bgcolor: "#ccc" }
            }}
          >
            <RefreshCw size={20} />
          </IconButton>
        </Box>
      </Box>

      {/* ✅ SECTION KPI */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(3, 1fr)"
          },
          gap: 2,
          mb: 4
        }}
      >
        {kpiCards.map((kpi, index) => (
          <Paper
            key={index}
            sx={{
              p: 2.5,
              borderRadius: 2,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              transition: "all 0.3s ease",
              border: "1px solid rgba(0,0,0,0.06)",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.12)"
              }
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 1.5,
                  bgcolor: kpi.bgColor,
                  color: kpi.color,
                  mr: 1.5
                }}
              >
                {kpi.icon}
              </Box>
              <Typography variant="subtitle2" sx={{ opacity: 0.7, fontWeight: 500 }}>
                {kpi.title}
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "#333" }}>
              {kpi.value}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* ✅ ESPACE POUR FUTURES SECTIONS */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Activités récentes
        </Typography>

        <Paper
          sx={{
            p: 3,
            borderRadius: 2,
            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
          }}
        >
          <Typography sx={{ opacity: 0.6, textAlign: "center" }}>
            Section activités récentes - À implémenter
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
