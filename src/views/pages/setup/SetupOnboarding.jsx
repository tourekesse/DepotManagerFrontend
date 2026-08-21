import React, { useEffect, useState } from "react";
import { Box, Container, Typography, Card, Grid } from "@mui/material";
import WineBarIcon from "@mui/icons-material/WineBar";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import SetupWizard from "./SetupWizard";
import SetupWizardBar from "./SetupWizardBar";

export default function SetupOnboarding() {
  const [type, setType] = useState(""); // "", "BAR", "DEPOT"
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    // Déduction automatique si l'utilisateur a déjà un rôle/type en localStorage
    try {
      const dmUser = JSON.parse(localStorage.getItem("dmUser") || "null");
      const activity = localStorage.getItem("activityType");
      if (dmUser?.role && String(dmUser.role).toUpperCase().includes("BAR")) {
        setType("BAR");
        return;
      }
      if (dmUser?.role && String(dmUser.role).toUpperCase().includes("DEPOT")) {
        setType("DEPOT");
        return;
      }
      if (activity === "BAR") setType("BAR");
      else if (activity === "DEPOT") setType("DEPOT");
    } catch (e) {
      /* ignore */
    }
  }, []);

  if (!ready) return null;

  // Wizard déjà déterminé → on l'affiche directement
  if (type === "BAR") return <SetupWizardBar />;
  if (type === "DEPOT") return <SetupWizard />;

  // Écran de choix du type d'activité
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Box
            component="img"
            src="/logo.svg"
            alt="DepotManager Logo"
            sx={{ width: 64, height: 64, mb: 2 }}
          />
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#6A1B9A", mb: 1 }}>
            Bienvenue 👋
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Pour bien commencer, dis-nous ton type d'établissement.
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Card
              onClick={() => setType("BAR")}
              sx={{
                cursor: "pointer",
                textAlign: "center",
                p: 3,
                border: "2px solid #e0e0e0",
                borderRadius: 3,
                transition: "all 0.2s",
                "&:hover": { borderColor: "#6A1B9A", bgcolor: "#faf5ff" },
              }}
            >
              <WineBarIcon sx={{ fontSize: 56, color: "#6A1B9A", mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Bar
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Caisse rapide et gestion des ventes en détail
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Card
              onClick={() => setType("DEPOT")}
              sx={{
                cursor: "pointer",
                textAlign: "center",
                p: 3,
                border: "2px solid #e0e0e0",
                borderRadius: 2,
                transition: "all 0.2s",
                "&:hover": { borderColor: "#6A1B9A", bgcolor: "#faf5ff" },
              }}
            >
              <WarehouseIcon sx={{ fontSize: 56, color: "#6A1B9A", mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Dépôt
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gestion des commandes et ventes semi-gros / gros
              </Typography>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}