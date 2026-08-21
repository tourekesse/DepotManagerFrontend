import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Card, Grid, TextField, Typography, Alert, Paper, IconButton, Select, MenuItem, InputLabel, FormControl } from "@mui/material";
import PageContainer from '../../../crud-dashboard/components/PageContainer';
import useNotifications from '../../../crud-dashboard/hooks/useNotifications/useNotifications';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { privateApi } from "../../../api/axios";
import { getUserCountry } from "../../../config/countries";
import { formatPhoneLocal } from "../../../utils/phoneUtils";

export default function LivreurCreatePage() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const userCountry = getUserCountry();
  const [form, setForm] = React.useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    role: "LIVREUR", // Rôle par défaut
    pointDeVenteId: "",
  });
  const [pointsVente, setPointsVente] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [showCredentials, setShowCredentials] = React.useState(false);
  const [credentials, setCredentials] = React.useState(null);
  const [error, setError] = React.useState(null);

  const loadPointsVenteFromSession = React.useCallback(() => {
    try {
      const raw = localStorage.getItem("dmUser") || localStorage.getItem("user");
      if (!raw) return [];
      const user = JSON.parse(raw);
      return user.pointsDeVente || user.points_de_vente || [];
    } catch (e) {
      return [];
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "phoneNumber") {
      const digits = value.replace(/\D/g, "").slice(0, userCountry.phoneDigits);
      const masked = formatPhoneLocal(digits, userCountry.code);
      setForm({ ...form, phoneNumber: masked });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    notifications.show("Copié dans le presse-papiers", { severity: "info" });
  };

  React.useEffect(() => {
    privateApi.get("/api/utilisateur/points-vente-emplacement")
      .then((res) => {
        const pvs = res.data || [];
        setPointsVente(pvs);
        if (pvs.length > 0) {
          const actif = pvs.find((pv) => pv.pointDeVenteActif) || pvs[0];
          setForm((current) => ({ ...current, pointDeVenteId: actif.id }));
        }
      })
      .catch(() => {
        const fallbackPvs = loadPointsVenteFromSession();
        setPointsVente(fallbackPvs);
        if (fallbackPvs.length > 0) {
          const activePvId = JSON.parse(localStorage.getItem("dmUser") || localStorage.getItem("user") || "{}")?.defaultPointDeVenteId;
          const actif = fallbackPvs.find((pv) => pv.id === activePvId) || fallbackPvs[0];
          setForm((current) => ({ ...current, pointDeVenteId: actif.id }));
          return;
        }
        notifications.show("Impossible de charger les points de vente", { severity: "error" });
      });
  }, [loadPointsVenteFromSession, notifications]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const phoneDigits = form.phoneNumber.replace(/\D/g, "");
      
      // Label selon le rôle sélectionné
      const isGerant = form.role === "GERANT_DEPOT";
      const roleLabel = isGerant ? "Gérant" : "Livreur";
      
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: phoneDigits,
        email: phoneDigits + "@depotmanager.local",
        role: form.role,
        pointDeVenteId: form.pointDeVenteId ? Number(form.pointDeVenteId) : null,
      };

      const response = await privateApi.post("/api/utilisateur/creer-livreur", payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      const data = response.data;
      console.log("Réponse création collaborateur:", data);
      if (data.success) {
        notifications.show(`${roleLabel} "${data.prenom || form.firstName} ${data.nom || form.lastName}" créé avec succès`, { severity: "success" });

        // Si SMS non envoyé, afficher les credentials
        console.log("credentialsEnvoyes:", data.credentialsEnvoyes);
        if (!data.credentialsEnvoyes) {
          console.log("Affichage credentials:", {
            telephone: data.telephone,
            motDePasse: data.motDePasse,
            otp: data.otp,
            lienActivation: data.lienActivation
          });
          setCredentials({
            telephone: data.telephone,
            motDePasse: data.motDePasse,
            otp: data.otp,
            lienActivation: data.lienActivation
          });
          setShowCredentials(true);
        } else {
          navigate("/accueil/utilisateur");
        }
      } else {
        const msg = data.message || "Erreur lors de la création";
        setError(msg);
        notifications.show(msg, { severity: "error" });
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data || "Erreur lors de l'ajout du collaborateur";
      console.error("Erreur création collaborateur:", err.response?.data || err.message);
      setError(typeof errorMessage === 'string' ? errorMessage : "Erreur lors de l'ajout du collaborateur");
      notifications.show(typeof errorMessage === 'string' ? errorMessage : "Erreur lors de l'ajout du collaborateur", { severity: "error" });
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
            Nouveau collaborateur
          </Typography>
        </Box>
      }
    >
      <Card sx={{ p: 4, maxWidth: 500, mx: "auto", borderRadius: 3 }}>
        {showCredentials && credentials ? (
          <Box>
            <Alert severity="warning" sx={{ mb: 3 }}>
              <strong>SMS non envoyé</strong> - Numéro non vérifié sur Twilio (compte trial).
              <br />Transmettez ces credentials au collaborateur manuellement.
            </Alert>
            
            <Paper sx={{ p: 3, mb: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#1a237e', fontWeight: 'bold' }}>
                📱 Credentials du collaborateur
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">Téléphone</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" fontWeight="medium">{credentials.telephone}</Typography>
                  <IconButton size="small" onClick={() => handleCopy(credentials.telephone)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">Mot de passe temporaire</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" fontWeight="medium" sx={{ fontFamily: 'monospace', bgcolor: '#fff', p: 1, borderRadius: 1 }}>
                    {credentials.motDePasse}
                  </Typography>
                  <IconButton size="small" onClick={() => handleCopy(credentials.motDePasse)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">Code OTP</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h5" fontWeight="bold" color="primary" sx={{ fontFamily: 'monospace', letterSpacing: 2 }}>
                    {credentials.otp}
                  </Typography>
                  <IconButton size="small" onClick={() => handleCopy(credentials.otp)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">Lien d'activation</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ color: 'primary.main', wordBreak: 'break-all', flex: 1 }}>
                    {credentials.lienActivation}
                  </Typography>
                  <IconButton size="small" onClick={() => handleCopy(credentials.lienActivation)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Paper>
            
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button onClick={() => navigate("/accueil/utilisateur")} variant="outlined">
                Retour à la liste
              </Button>
              <Button onClick={() => { setShowCredentials(false); setForm({ firstName: "", lastName: "", phoneNumber: "", role: "LIVREUR", pointDeVenteId: pointsVente[0]?.id || "" }); }} variant="contained" sx={{ bgcolor: '#1a237e' }}>
                Créer un autre collaborateur
              </Button>
            </Box>
          </Box>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField label="Prénom" name="firstName" value={form.firstName} onChange={handleChange} required fullWidth />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Nom" name="lastName" value={form.lastName} onChange={handleChange} required fullWidth />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Téléphone" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} required fullWidth placeholder="__ __ __ __ __" inputProps={{ inputMode: "numeric", maxLength: 14 }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel id="role-label">Rôle</InputLabel>
                  <Select
                    labelId="role-label"
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    label="Rôle"
                    required
                  >
                    <MenuItem value="GERANT_DEPOT">Gérant</MenuItem>
                    <MenuItem value="LIVREUR">Livreur</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small" required>
                  <InputLabel id="point-vente-label">Point de vente</InputLabel>
                  <Select
                    labelId="point-vente-label"
                    name="pointDeVenteId"
                    value={form.pointDeVenteId}
                    onChange={handleChange}
                    label="Point de vente"
                  >
                    {pointsVente.map((pv) => (
                      <MenuItem key={pv.id} value={pv.id}>
                        {pv.nom}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button onClick={() => navigate("/accueil/utilisateur")}>Annuler</Button>
                <Button type="submit" variant="contained" disabled={saving || !form.pointDeVenteId} sx={{ bgcolor: '#1a237e' }}>
                  {saving ? "Ajout..." : "Ajouter"}
                </Button>
              </Grid>
            </Grid>
          </form>
        )}
      </Card>
    </PageContainer>
  );
}
