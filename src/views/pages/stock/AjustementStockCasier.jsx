import React, { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, Grid, TextField,
  Button, MenuItem, Divider, Stack, Alert, Snackbar
} from "@mui/material";
import PageContainer from "../../../crud-dashboard/components/PageContainer";
import { privateApi } from "../../../api/axios";
import { getActivePointDeVenteId } from "../../../utils/pdv";
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";

const TYPES_MOUVEMENT = [
  { value: "AJUSTEMENT", label: "Ajustement" },
  { value: "INITIALISATION", label: "Initialisation" },
];

export default function AjustementStockCasier() {
  const notifications = useNotifications();
  const [typeCasiers, setTypeCasiers] = useState([]);
  const [recentRetours, setRecentRetours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    typeCasierId: "",
    quantitePlein: 0,
    quantiteVide: 0,
    typeMouvement: "AJUSTEMENT",
    commentaire: "",
  });

  useEffect(() => {
    const pvId = getActivePointDeVenteId();
    if (!pvId) return;
    privateApi.get(`/api/type-casiers/point-de-vente/${pvId}/consignables`)
      .then(res => setTypeCasiers(res.data))
      .catch(() => notifications.show("Erreur chargement types casiers", { severity: "error" }));

    // Charger les retours de dettes récents
    privateApi.get(`/api/mouvement-stock-casier/retours-dette?pvId=${pvId}&limit=15`)
      .then(res => setRecentRetours(res.data))
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === "commentaire" ? value : Number(value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.typeCasierId) {
      notifications.show("Sélectionnez un type de casier", { severity: "warning" });
      return;
    }
    if (!form.commentaire.trim()) {
      notifications.show("Le commentaire est obligatoire", { severity: "warning" });
      return;
    }
    setLoading(true);
    try {
      await privateApi.post("/api/mouvement-stock-casier/ajustement", {
        typeCasierId: Number(form.typeCasierId),
        quantitePlein: Number(form.quantitePlein),
        quantiteVide: Number(form.quantiteVide),
        commentaire: form.commentaire.trim(),
      });
      notifications.show("Ajustement enregistré avec succès", { severity: "success" });
      setForm({ typeCasierId: "", quantitePlein: 0, quantiteVide: 0, typeMouvement: "AJUSTEMENT", commentaire: "" });
    } catch (err) {
      notifications.show(err.response?.data?.message || "Erreur lors de l'ajustement", { severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Ajustement du stock de casiers">
      {/* Historique des retours physiques d'emballages (lors du règlement de dettes) */}
      {recentRetours.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📦 Retours physiques d'emballages (dettes)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Mouvements de stock créés quand un client ramène physiquement ses emballages pour réduire sa dette.
            </Typography>
            {recentRetours.map((mvt, idx) => (
              <Box key={idx} sx={{ mb: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2">
                  {new Date(mvt.dateOperation).toLocaleDateString('fr-FR')} — {mvt.typeMouvement}
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
                  +{mvt.quantiteVide} vide(s)<br />
                  {mvt.commentaire}
                </Typography>
                {mvt.typeCasier && (
                  <Typography variant="caption" color="text.secondary">
                    Type: {mvt.typeCasier.nomDisplay || mvt.typeCasier.codeTypeCasier}
                  </Typography>
                )}
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="Type de casier"
                  name="typeCasierId"
                  value={form.typeCasierId}
                  onChange={handleChange}
                  fullWidth
                  required
                >
                  {typeCasiers.map(tc => (
                    <MenuItem key={tc.id} value={tc.id}>
                      {tc.nomDisplay || tc.marque} - {tc.nbreBouteilles || tc.nbre_bouteilles} bt
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  label="Qté Plein"
                  name="quantitePlein"
                  type="number"
                  value={form.quantitePlein}
                  onChange={handleChange}
                  fullWidth
                  helperText="+ entrée / - sortie"
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  label="Qté Vide"
                  name="quantiteVide"
                  type="number"
                  value={form.quantiteVide}
                  onChange={handleChange}
                  fullWidth
                  helperText="+ entrée / - sortie"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Commentaire (obligatoire)"
                  name="commentaire"
                  value={form.commentaire}
                  onChange={handleChange}
                  fullWidth
                  required
                  multiline
                  rows={2}
                  placeholder="Ex: Vente de 2 casiers nus à un client, inventaire, etc."
                />
              </Grid>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <strong>Rappel :</strong> Ce mouvement sera enregistré dans l'historique.
                  Les compteurs (pleins/vides) seront mis à jour automatiquement.
                </Alert>
              </Grid>
            </Grid>
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                size="large"
              >
                {loading ? "Enregistrement..." : "Enregistrer l'ajustement"}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
