// src/views/pages/produit/form/ProductForm.jsx
import * as React from "react";
import {
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  Divider,
  Stack,
  Button,
  Autocomplete,
  Chip,
} from "@mui/material";

// 🎯 DONNÉES DE SUGGESTIONS
const MARQUES_SUGGEREES = [
  // Bières
  "Castel", "Guinness", "Beaufort", "Flag", "Tuborg", "Bock", 
  // Sodas
  "Fanta", "Coca-Cola", "Youki", "Dopel", "Number One", "Bavaria",
  // Vins et Vins Mousseux
  "Maison Castel Cuvée Blanche Mousseux", "Vinto", "J.P. Chenet", 
  "Chamdor", "Gérard Bertrand", "Luc Belaire", "La Vieille Ferme",
  "Appletiser", "Baileys Irish Cream", "Maison Castel Bordeaux"
];

const FORMATS_SUGGERES = [
  // Bières
  "33cl", "50cl", "60cl", "66cl", "75cl", "100cl", "1.5L", "Standard",
  // Vins spécifiques
  "75cl", "1.5L", "Bouteille", "Magnum"
];

const GROUPES_SUGGERES = [
  "BIERE", "SODA", "EAU", "MALTA", "GAZEUSE", "VIN", "VIN MOUSSEUX"
];

export default function ProductForm({
  values,
  errors = {},
  onChange,
  onSubmit,
  onCancel,
  submitLabel = "Enregistrer",
  loading = false,
}) {
  return (
    <Card>
      <CardContent>
        {/* ================= IDENTIFICATION ================= */}
        <Typography variant="subtitle1" fontWeight="bold">
          Identification
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Désignation"
              name="designation"
              value={values.designation}
              onChange={onChange}
              error={!!errors.designation}
              helperText={errors.designation}
              fullWidth
              required
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <Autocomplete
              freeSolo
              options={MARQUES_SUGGEREES}
              value={values.marque}
              onChange={(_, newValue) => onChange({ target: { name: "marque", value: newValue || "" } })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Marque"
                  error={!!errors.marque}
                  helperText={errors.marque}
                  fullWidth
                />
              )}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <Autocomplete
              freeSolo
              options={FORMATS_SUGGERES}
              value={values.format}
              onChange={(_, newValue) => onChange({ target: { name: "format", value: newValue || "" } })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Format"
                  fullWidth
                />
              )}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Autocomplete
              freeSolo
              options={GROUPES_SUGGERES}
              value={values.groupeLiquide}
              onChange={(_, newValue) => onChange({ target: { name: "groupeLiquide", value: newValue || "" } })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Groupe liquide"
                  error={!!errors.groupeLiquide}
                  helperText={errors.groupeLiquide || "Ex: BIERE, GAZEUSE, EAU, VIN..."}
                  fullWidth
                  required
                />
              )}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              label="Bouteilles par casier"
              name="nbreBouteillesParCasier"
              type="number"
              value={values.nbreBouteillesParCasier}
              onChange={onChange}
              error={!!errors.nbreBouteillesParCasier}
              helperText={errors.nbreBouteillesParCasier}
              fullWidth
              required
            />
          </Grid>
        </Grid>

        {/* ================= PRIX ================= */}
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 4 }}>
          Prix
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              label="Prix achat HT"
              name="prixAchatHt"
              type="number"
              value={values.prixAchatHt}
              onChange={onChange}
              fullWidth
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="Prix vente HT"
              name="prixVenteHt"
              type="number"
              value={values.prixVenteHt}
              onChange={onChange}
              error={!!errors.prixVenteHt}
              helperText={errors.prixVenteHt}
              fullWidth
              required
            />
          </Grid>
        </Grid>

        {/* ================= CONSIGNES ================= */}
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 4 }}>
          Consignes
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={4}>
            <TextField
              label="Consigne bouteille"
              name="consigneBouteille"
              type="number"
              value={values.consigneBouteille}
              onChange={onChange}
              fullWidth
            />
          </Grid>

          <Grid item xs={4}>
            <TextField
              label="Consigne casier"
              name="consigneCasier"
              type="number"
              value={values.consigneCasier}
              onChange={onChange}
              fullWidth
            />
          </Grid>

          <Grid item xs={4}>
            <TextField
              label="Coût casier neuf"
              name="coutCasierNeuf"
              type="number"
              value={values.coutCasierNeuf}
              onChange={onChange}
              fullWidth
            />
          </Grid>
        </Grid>

        {/* ================= STOCK ================= */}
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 4 }}>
          Stock
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              label="Stock initial"
              name="stockInitial"
              type="number"
              value={values.stockInitial}
              onChange={onChange}
              error={!!errors.stockInitial}
              helperText={errors.stockInitial}
              fullWidth
              required
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label="Stock minimum"
              name="stockMinimum"
              type="number"
              value={values.stockMinimum}
              onChange={onChange}
              fullWidth
            />
          </Grid>
        </Grid>

        {/* ================= ACTIONS ================= */}
        <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 4 }}>
          {onCancel && (
            <Button variant="outlined" onClick={onCancel} disabled={loading}>
              Annuler
            </Button>
          )}
          <Button
            variant="contained"
            onClick={onSubmit}
            disabled={loading}
          >
            {submitLabel}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
