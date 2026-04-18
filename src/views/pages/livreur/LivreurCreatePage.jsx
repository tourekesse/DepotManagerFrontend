import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Card, Grid, TextField, CircularProgress, Typography } from "@mui/material";
import PageContainer from '../../../crud-dashboard/components/PageContainer';
import useNotifications from '../../../crud-dashboard/hooks/useNotifications/useNotifications';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { publicApi } from "../../../api/axios";

export default function LivreurCreatePage() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const [form, setForm] = React.useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    password: "",
  });
  const [saving, setSaving] = React.useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // On envoie 'login' = phoneNumber uniquement
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        password: form.password,
        login: form.phoneNumber,
        phoneNumber: form.phoneNumber
      };
      await publicApi.post("/api/utilisateur/creer-livreur", payload);
      notifications.show("Livreur ajouté avec succès", { severity: "success" });
      navigate("/accueil/livreurs");
    } catch (err) {
      notifications.show("Erreur lors de l'ajout du livreur", { severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer
      title={
        <Box display="flex" alignItems="center" gap={1}>
          <LocalShippingIcon sx={{ fontSize: 22 }} />
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Nouveau Livreur
          </Typography>
        </Box>
      }
    >
      <Card sx={{ p: 4, maxWidth: 500, mx: "auto", borderRadius: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField label="Prénom" name="firstName" value={form.firstName} onChange={handleChange} required fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Nom" name="lastName" value={form.lastName} onChange={handleChange} required fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Téléphone" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} required fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Mot de passe" name="password" value={form.password} onChange={handleChange} type="password" required fullWidth />
            </Grid>
            <Grid item xs={12} sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button onClick={() => navigate("/accueil/livreurs")}>Annuler</Button>
              <Button type="submit" variant="contained" disabled={saving} sx={{ bgcolor: '#1a237e' }}>
                {saving ? "Ajout..." : "Ajouter"}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Card>
    </PageContainer>
  );
}
