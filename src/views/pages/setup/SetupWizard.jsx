// src/pages/SetupWizard.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Box,
  Typography,
  Stack,
} from "@mui/material";
import GlobalStyles from "@mui/material/GlobalStyles";
import { finalizeSetup } from "./SetupService";

export default function SetupWizard() {
  const navigate = useNavigate();
  const [etablissement, setTypeEtablissement] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const typesOptions = [
    { label: "Dépôt", value: "DEPOT" },
    { label: "Sous-Dépôt", value: "SOUS_DEPOT" },
    { label: "Bar", value: "BAR" },
    { label: "Sous-Dépôt et Bar", value: "SOUS_DEPOT_BAR" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (submitting) return;

    const dmUser = JSON.parse(localStorage.getItem("dmUser"));
    const phoneCandidate = telephone || dmUser?.phone_number || dmUser?.phone || "";
    const phoneClean = phoneCandidate.replace(/\s/g, "");
    const isValid = etablissement && nom && phoneClean.length >= 8 && adresse;

    if (!isValid) {
      setErrorMsg("Tous les champs sont requis avec un téléphone valide.");
      return;
    }

    if (!dmUser?.userId) {
      setErrorMsg("Impossible d’identifier l’utilisateur (userId manquant).");
      return;
    }

    const payload = {
      userId: dmUser.userId,
      nomEtablissement: nom,
      adresseEtablissement: adresse,
      villeEtablissement: "Abidjan",
      nomPv: nom + " - PV Principal",
      codePv: "PV001",
      adressePv: adresse,
      villePv: "Abidjan",
      phonePv: phoneClean,
      typeEtablissement: etablissement,
      role: "CLIENT_BAR",
    };

    setSubmitting(true);
    try {
      const res = await finalizeSetup(payload);
      setSuccessMsg(res.message || "Configuration complétée.");

      const pvId = res.pointDeVenteId || res.pvId || res.point_de_vente_id;
      const pvNom = res.pointDeVenteNom || payload.nomPv;

      dmUser.onboardingCompleted = true;
      if (pvId) {
        dmUser.point_de_vente_actif_id = pvId;
        dmUser.pointDeVenteActifId = pvId;
        localStorage.setItem("activePV", JSON.stringify({ id: pvId, nom: pvNom, code: payload.codePv, adresse: payload.adressePv }));
      }
      localStorage.setItem("dmUser", JSON.stringify(dmUser));
      localStorage.setItem("activityType", etablissement);

      setTimeout(() => {
        navigate("/accueil");
        window.location.reload(); // Force le rechargement du contexte utilisateur/menus
      }, 800);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Le serveur a refusé la requête.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Palette et animations inspirées du thème "maquis ivoirien" */}
      <GlobalStyles styles={`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
        :root {
          --orange-ci: #ff8c00;
          --blanc-ci: #ffffff;
          --vert-ci: #00b04f;
          --solibra-gold: #ffd700;
          --neon-bleu: #00bfff;
          --glaciere-blanc-rgb: 240, 248, 255;
          --neon-bleu-rgb: 0, 191, 255;
          --bois-acajou-rgb: 139, 69, 19;
        }
        .setup-wizard-page {
          font-family: 'Poppins', 'Inter', system-ui, sans-serif;
          background: radial-gradient(circle at 20% 20%, rgba(255, 140, 0, 0.18), transparent 32%),
                      radial-gradient(circle at 80% 10%, rgba(0, 191, 255, 0.25), transparent 34%),
                      linear-gradient(135deg, rgba(var(--glaciere-blanc-rgb), 0.9) 0%, rgba(var(--neon-bleu-rgb), 0.18) 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          box-sizing: border-box;
        }
        .setup-card {
          background: rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.35);
          box-shadow: 0 15px 40px rgba(0, 191, 255, 0.25), 0 10px 25px rgba(0, 0, 0, 0.08);
          border-radius: 20px;
          animation: riseIn 0.7s ease-out forwards;
          opacity: 0;
        }
        .setup-title {
          color: var(--orange-ci);
          font-weight: 800;
          text-shadow: 0 6px 16px rgba(0,0,0,0.18);
        }
        .setup-subtitle {
          color: rgba(var(--bois-acajou-rgb), 0.8);
        }
        .setup-btn {
          background: linear-gradient(45deg, var(--orange-ci) 0%, var(--solibra-gold) 100%);
          color: var(--blanc-ci);
          font-weight: 700;
          box-shadow: 0 8px 22px rgba(255, 140, 0, 0.35);
          position: relative;
          overflow: hidden;
        }
        .setup-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(255, 140, 0, 0.45);
        }
        .setup-btn:active {
          transform: translateY(0);
        }
        .setup-btn::after {
          content: "";
          position: absolute;
          inset: -50%;
          background: radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 40%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .setup-btn:hover::after { opacity: 1; }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(255, 140, 0, 0.12);
          color: var(--orange-ci);
          font-weight: 700;
          box-shadow: 0 6px 16px rgba(255, 140, 0, 0.25);
        }
        .hero-orb {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #fff, rgba(255,255,255,0) 60%), linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%);
          box-shadow: 0 12px 30px rgba(0, 191, 255, 0.35);
          display: grid;
          place-items: center;
          color: white;
          font-size: 32px;
          animation: floaty 4s ease-in-out infinite;
        }
        .pattern {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: radial-gradient(rgba(255,255,255,0.18) 1px, transparent 0);
          background-size: 26px 26px;
          opacity: 0.35;
        }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
        .delay-4 { animation-delay: 0.4s; }
        @keyframes floaty {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes riseIn {
          from { transform: translateY(24px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}/>
      <Box className="setup-wizard-page">
        <Card className="setup-card" sx={{ width: "100%", maxWidth: 760, position: "relative", overflow: "hidden" }}>
          <span className="pattern" />
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="center" mb={3}>
              <Box className="hero-orb" aria-hidden>
                🚚
              </Box>
              <Box flex={1} textAlign={{ xs: "center", md: "left" }}>
                <Box display="inline-flex" className="hero-badge delay-1" sx={{ mb: 1 }}>
                  <span>Essai gratuit</span>
                  <span style={{ fontWeight: 800 }}>14 jours</span>
                </Box>
                <Typography variant="h4" className="setup-title delay-2" gutterBottom>
                  Configure ton dépôt en 2 minutes
                </Typography>
                <Typography variant="subtitle1" className="setup-subtitle delay-3">
                  On prépare ton point de vente, tes casiers et tes livraisons dès maintenant.
                </Typography>
              </Box>
            </Stack>
            <Box mb={3}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1,
                  color: "primary.main",
                  fontWeight: 700,
                }}
                className="delay-2"
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                    boxShadow: "0 0 0 6px rgba(0,191,255,0.18)"
                  }}
                />
                <span>Étape unique : informations du dépôt</span>
              </Box>
              <Box
                sx={{
                  height: 6,
                  borderRadius: 999,
                  background: "linear-gradient(90deg, #00bfff 0%, #ff8c00 100%)",
                  boxShadow: "0 6px 14px rgba(255,140,0,0.35)"
                }}
                className="delay-3"
              />
            </Box>

          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2, textAlign: "center" }}>
              {errorMsg}
            </Alert>
          )}

          {successMsg && (
            <Alert severity="success" sx={{ mb: 2, textAlign: "center" }}>
              {successMsg}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Type d'activité *</InputLabel>
              <Select
                value={etablissement}
                label="Type d'activité *"
                onChange={(e) => setTypeEtablissement(e.target.value)}
                required
              >
                <MenuItem value="">
                  <em>-- Sélectionnez le type --</em>
                </MenuItem>
                {typesOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Nom *"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              label="Téléphone *"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="99 99 99 99 99"
              required
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              label="Adresse *"
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              required
              sx={{ mb: 4 }}
            />

            <Button
              type="submit"
              variant="contained"
              className="setup-btn"
              fullWidth
              size="large"
              sx={{ py: 1.4, borderRadius: 2 }}
              disabled={submitting}
            >
              {submitting ? "Création en cours..." : "Créer mon Dépôt"}
            </Button>

            <Box
              mt={2.5}
              display="flex"
              alignItems="center"
              justifyContent="center"
              gap={1.5}
              sx={{ color: "rgba(0,0,0,0.72)", fontWeight: 600 }}
              className="delay-4"
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "rgba(0,191,255,0.15)",
                  display: "grid",
                  placeItems: "center",
                  color: "#00bfff",
                  fontWeight: 800,
                  boxShadow: "0 8px 18px rgba(0,191,255,0.25)"
                }}
              >
                ?
              </Box>
              <span>Besoin d’aide ? Écrivez-nous sur supportdepotmanager@gm-soft.ca.</span>
            </Box>
          </Box>
        </CardContent>
      </Card>
      </Box>
    </>
  );
}
