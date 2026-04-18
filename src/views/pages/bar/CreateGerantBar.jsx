import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Typography,
  Stack,
} from "@mui/material";
import PageContainer from "../../../crud-dashboard/components/PageContainer";
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";
import { privateApi } from "../../../api/axios";
import { useUser } from "../../../context/UserContext";

export default function CreateGerantBar() {
  const notifications = useNotifications();
  const { activePointDeVente } = useUser();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!activePointDeVente?.id) {
      notifications.show("Sélectionne un point de vente actif", { severity: "error" });
      return;
    }
    if (!form.firstName || !form.lastName || (!form.email && !form.phoneNumber) || !form.password) {
      notifications.show("Renseigne prénom, nom, email ou téléphone, mot de passe", { severity: "warning" });
      return;
    }

    setLoading(true);
    try {
      await privateApi.post("/api/utilisateur/creer-gerant-bar", {
        ...form,
        pointDeVenteId: activePointDeVente.id,
      });
      notifications.show("Gérant bar créé", { severity: "success" });
      setForm({ firstName: "", lastName: "", email: "", phoneNumber: "", password: "" });
    } catch (e) {
      const msg = e.response?.data || e.response?.data?.message || e.message || "Erreur";
      notifications.show(msg, { severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Créer un gérant bar" breadcrumbs={[{ title: "Bar", path: "/accueil/bar/ventes" }, { title: "Gérant" }]}> 
      <Card sx={{ maxWidth: 720, mx: "auto", mt: 2 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Infos du gérant
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField label="Prénom" name="firstName" value={form.firstName} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Nom" name="lastName" value={form.lastName} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Email" name="email" value={form.email} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Téléphone" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Mot de passe" name="password" type="password" value={form.password} onChange={handleChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Point de vente" value={activePointDeVente?.nom || "Non sélectionné"} InputProps={{ readOnly: true }} fullWidth />
            </Grid>
          </Grid>

          <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
            <Button variant="contained" onClick={handleSubmit} disabled={loading}>
              {loading ? "Création..." : "Créer"}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
