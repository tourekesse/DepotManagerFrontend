import * as React from "react";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Box,
  Alert,
  Divider,
} from "@mui/material";

export default function ProductBulkCard({ produit, onChange }) {
  const {
    id,
    marque,
    format,
    prixAchatHt,
    prixVenteHt,
    stockInitial,
    consigneBouteille,
    consigneCasier,
    coutCasierNeuf,
  } = produit;

  const valeurStock = stockInitial * prixVenteHt;
  const marge = prixVenteHt - prixAchatHt;

  const erreurs = {
    prixVenteHt: prixVenteHt <= 0,
    stockInitial: stockInitial < 0,
  };

  const warningMarge = prixAchatHt > prixVenteHt;

  return (
    <Card sx={{ mb: 3, borderLeft: "6px solid #1976d2" }}>
      <CardContent>
        {/* ================= TITRE ================= */}
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          {marque} {format}
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {/* ================= SAISIE ================= */}
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              label="Prix achat"
              type="number"
              value={prixAchatHt}
              onChange={(e) =>
                onChange(id, "prixAchatHt", Number(e.target.value))
              }
              fullWidth
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="Prix vente *"
              type="number"
              value={prixVenteHt}
              error={erreurs.prixVenteHt}
              helperText={
                erreurs.prixVenteHt ? "Prix vente obligatoire" : ""
              }
              onChange={(e) =>
                onChange(id, "prixVenteHt", Number(e.target.value))
              }
              fullWidth
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="Stock initial *"
              type="number"
              value={stockInitial}
              error={erreurs.stockInitial}
              helperText={
                erreurs.stockInitial ? "Stock invalide" : ""
              }
              onChange={(e) =>
                onChange(id, "stockInitial", Number(e.target.value))
              }
              fullWidth
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="Consigne bouteille"
              type="number"
              value={consigneBouteille}
              onChange={(e) =>
                onChange(id, "consigneBouteille", Number(e.target.value))
              }
              fullWidth
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="Consigne casier"
              type="number"
              value={consigneCasier}
              onChange={(e) =>
                onChange(id, "consigneCasier", Number(e.target.value))
              }
              fullWidth
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="Coût casier neuf"
              type="number"
              value={coutCasierNeuf}
              onChange={(e) =>
                onChange(id, "coutCasierNeuf", Number(e.target.value))
              }
              fullWidth
            />
          </Grid>
        </Grid>

        {/* ================= ALERTES ================= */}
        {warningMarge && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Prix d’achat supérieur au prix de vente
          </Alert>
        )}

        {/* ================= SYNTHÈSE ================= */}
        <Box
          sx={{
            mt: 3,
            p: 2,
            backgroundColor: "#f9fafb",
            borderRadius: 1,
          }}
        >
          <Typography variant="body2">
            <strong>Valeur du stock :</strong>{" "}
            {valeurStock.toLocaleString()} F
          </Typography>
          <Typography variant="body2">
            <strong>Marge unitaire :</strong>{" "}
            {marge.toLocaleString()} F
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
