import React, { useState } from "react";
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
  Container,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Stack,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { InputMask } from "primereact/inputmask";
import { getCountries, DEFAULT_COUNTRY, getCountryByCode } from "../../../config/countries";
import {
  Store,
  MapPin,
  Phone,
  Building2,
  CheckCircle,
  ChevronRight,
  Map,
  Locate,
  Search,
  Globe,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { finalizeSetup } from "./SetupService";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function MapRecenter({ center, zoom = 15 }) {
  const map = useMap();
  React.useEffect(() => {
    if (center) map.setView(center, zoom);
  }, [center, map, zoom]);
  return null;
}

function MapClickHandler({ onPick }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function AddressMapPicker({ open, lat, lng, onClose, onConfirm, country }) {
  const [center, setCenter] = useState(country?.mapCenter || DEFAULT_COUNTRY.mapCenter);
  const [marker, setMarker] = useState(null);
  const [address, setAddress] = useState("");
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (lat && lng) { setMarker([lat, lng]); setCenter([lat, lng]); }
    else { setMarker(null); setCenter(country?.mapCenter || [5.359952, -4.008256]); }
    setAddress(""); setSearchText(""); setSearchResults([]);
  }, [open, lat, lng]);

  const reverseGeocode = async (la, lo) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${la}&lon=${lo}`);
      const data = await res.json();
      if (data?.display_name) setAddress(data.display_name);
    } catch (e) {}
  };

  const pickPosition = (la, lo, addr = "") => {
    setMarker([la, lo]); setCenter([la, lo]);
    if (addr) setAddress(addr); else reverseGeocode(la, lo);
  };

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(searchText.trim())}`);
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (e) { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { pickPosition(pos.coords.latitude, pos.coords.longitude); setLocating(false); },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 900 }}>Choisir la position de ton dépôt</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField fullWidth size="small" label="Rechercher un lieu"
              value={searchText} onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }} />
            <Button variant="contained" startIcon={searching ? <CircularProgress size={16} color="inherit" /> : <Search />}
              onClick={handleSearch} disabled={searching} sx={{ minWidth: 120 }}>Rechercher</Button>
            <Button variant="outlined" startIcon={locating ? <CircularProgress size={16} /> : <Locate />}
              onClick={handleLocateMe} disabled={locating} sx={{ minWidth: 130 }}>Ma position</Button>
          </Stack>

          {searchResults.length > 0 && (
            <Paper variant="outlined" sx={{ maxHeight: 170, overflow: "auto" }}>
              <List dense disablePadding>
                {searchResults.map((r) => (
                  <ListItemButton key={`${r.place_id}-${r.lat}-${r.lon}`}
                    onClick={() => { pickPosition(r.lat, r.lon, r.display_name); setSearchResults([]); }}>
                    <ListItemText primary={r.display_name} primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }} />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}

          <Box sx={{ height: { xs: 320, sm: 380 }, borderRadius: 1, overflow: "hidden", border: "1px solid #ddd" }}>
            <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapRecenter center={center} zoom={marker ? 16 : 13} />
              <MapClickHandler onPick={pickPosition} />
              {marker && <Marker position={marker}><Popup>Position du dépôt</Popup></Marker>}
            </MapContainer>
          </Box>

          <Alert severity={marker ? "success" : "info"} icon={<MapPin />}>
            {marker ? `Position : ${marker[0].toFixed(6)}, ${marker[1].toFixed(6)}`
              : "Clique sur la carte ou cherche un lieu pour placer ton dépôt."}
          </Alert>

          <TextField fullWidth size="small" label="Adresse / repère" value={address}
            onChange={(e) => setAddress(e.target.value)} placeholder="Ex: Cocody, près du pont..." />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={() => onConfirm(address, marker)}
          disabled={!address.trim() && !marker}>Utiliser cette position</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function SetupWizard() {
  const navigate = useNavigate();
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY.code);
  const [etablissement, setTypeEtablissement] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [adresseLat, setAdresseLat] = useState(null);
  const [adresseLng, setAdresseLng] = useState(null);
  const [openMapPicker, setOpenMapPicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const country = getCountryByCode(countryCode);

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

    const missing = [];
    if (!etablissement) missing.push("Type d'activité");
    if (!nom.trim()) missing.push("Nom de l'établissement");
    if (phoneClean.length < country.phoneDigits) missing.push(`Téléphone (${country.phoneDigits} chiffres)`);
    if (!adresse.trim()) missing.push("Adresse / Localisation");

    if (missing.length > 0) {
      setErrorMsg(`Champs manquants : ${missing.join(", ")}`);
      return;
    }

    const codeBase = nom.normalize("NFD").replace(/[\u0300-\u036f\s-]/g, "").toUpperCase().substring(0, 5);
    const uniqueSuffix = Date.now().toString(36).toUpperCase();
    const codePvUnique = `PV-${codeBase}-${uniqueSuffix}`;

    if (!dmUser?.userId) {
      setErrorMsg("Impossible d'identifier l'utilisateur (userId manquant).");
      return;
    }

    let profil, fonction;
    if (etablissement === 'BAR') {
      profil = 'Administrateur Général';
      fonction = 'Propriétaire';
    } else if (etablissement === 'DEPOT') {
      profil = 'Administrateur Général';
      fonction = 'Propriétaire';
    } else if (etablissement === 'SOUS_DEPOT') {
      profil = 'Administrateur';
      fonction = 'Propriétaire';
    } else if (etablissement === 'SOUS_DEPOT_BAR') {
      profil = 'Administrateur';
      fonction = 'Propriétaire';
    } else {
      profil = 'CLIENT_BAR';
      fonction = 'Client';
    }

    const payload = {
      userId: dmUser.userId,
      nomEtablissement: nom,
      adresseEtablissement: adresse,
      villeEtablissement: country.mapCity,
      nomPv: nom + " - PV Principal",
      codePv: codePvUnique,
      adressePv: adresse,
      villePv: country.mapCity,
      phonePv: phoneClean,
      pays: country.code,
      dialCode: country.dialCode,
      typeEtablissement: etablissement,
      profil: profil,
      fonction: fonction,
      latitude: adresseLat || undefined,
      longitude: adresseLng || undefined,
    };

    setSubmitting(true);
    try {
      const res = await finalizeSetup(payload);
      setSuccessMsg(res.message || "Configuration complétée.");

      const pvId = res.pointDeVenteId || res.pvId || res.point_de_vente_id;
      const pvNom = res.pointDeVenteNom || payload.nomPv;

      dmUser.onboardingCompleted = true;
      if (!dmUser.role) {
        dmUser.role = "CLIENT_BAR";
      }
      if (pvId) {
        dmUser.point_de_vente_actif_id = pvId;
        dmUser.pointDeVenteActifId = pvId;
        localStorage.setItem("activePV", JSON.stringify({ id: pvId, nom: pvNom, code: codePvUnique, adresse: payload.adressePv }));
      }
      localStorage.setItem("dmUser", JSON.stringify(dmUser));
      localStorage.setItem("role", dmUser.role);
      localStorage.setItem("activityType", etablissement);
      localStorage.setItem("userCountry", countryCode);

      setTimeout(() => {
        navigate("/accueil");
        window.location.reload();
      }, 800);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Le serveur a refusé la requête.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#FFFFFF",
        py: { xs: 4, md: 8 },
      }}
    >
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ textAlign: "center", mb: { xs: 3, md: 6 } }}>
          <Box
            component="img"
            src="/logo.svg"
            alt="DepotManager Logo"
            sx={{ width: { xs: 48, md: 64 }, height: { xs: 48, md: 64 }, mb: 2 }}
          />
          <Typography
            variant={{ xs: "h5", md: "h4" }}
            sx={{ fontWeight: 800, color: "#6A1B9A", mb: 1 }}
          >
            Configure ton dépôt
          </Typography>
          <Typography variant="body1" color="text.secondary">
            On prépare ton point de vente en quelques étapes
          </Typography>
        </Box>

        {/* Stepper */}
        <Stepper activeStep={0} sx={{ mb: 5 }}>
          <Step completed={false}>
            <StepLabel>Informations</StepLabel>
          </Step>
          <Step>
            <StepLabel>Confirmation</StepLabel>
          </Step>
        </Stepper>

        {/* Form Card */}
        <Card
          sx={{
            borderRadius: 3,
            border: "1px solid #e0e0e0",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}
        >
          <CardContent sx={{ p: { xs: 2, md: 4 } }}>
            {/* Badges */}
            <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: "#e8f5e9",
                  color: "#2e7d32",
                }}
              >
                <CheckCircle size={16} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  14 jours gratuit
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: "#f3e5f5",
                  color: "#6A1B9A",
                }}
              >
                <CheckCircle size={16} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  Sans carte bancaire
                </Typography>
              </Box>
            </Box>

            {errorMsg && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {errorMsg}
              </Alert>
            )}

            {successMsg && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {successMsg}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                {/* Pays */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                    <Globe size={18} color="#6A1B9A" /> Pays *
                  </Typography>
                  <Grid container spacing={1.5}>
                    {getCountries().map((c) => (
                      <Grid item xs={4} key={c.code}>
                        <Card
                          onClick={() => { setCountryCode(c.code); setTelephone(""); }}
                          sx={{
                            cursor: "pointer",
                            textAlign: "center",
                            p: 1.5,
                            border: countryCode === c.code ? "2px solid #6A1B9A" : "2px solid #e0e0e0",
                            bgcolor: countryCode === c.code ? "#f3e5f5" : "#fff",
                            borderRadius: 2,
                            transition: "all 0.2s",
                            "&:hover": { borderColor: "#6A1B9A", bgcolor: "#faf5ff" },
                          }}
                        >
                          <Typography variant="h5" sx={{ mb: 0.5 }}>{c.flag}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: countryCode === c.code ? 800 : 500, color: countryCode === c.code ? "#6A1B9A" : "#333" }}>
                            {c.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {c.dialCode}
                          </Typography>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>

                {/* Type d'activité */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                    <Building2 size={18} color="#6A1B9A" /> Type d'activité *
                  </Typography>
                  <Grid container spacing={1.5}>
                    {typesOptions.map((opt) => (
                      <Grid item xs={6} sm={3} key={opt.value}>
                        <Card
                          onClick={() => setTypeEtablissement(opt.value)}
                          sx={{
                            cursor: "pointer",
                            textAlign: "center",
                            p: 2,
                            border: etablissement === opt.value ? "2px solid #6A1B9A" : "2px solid #e0e0e0",
                            bgcolor: etablissement === opt.value ? "#f3e5f5" : "#fff",
                            borderRadius: 2,
                            transition: "all 0.2s",
                            "&:hover": { borderColor: "#6A1B9A", bgcolor: "#faf5ff" },
                          }}
                        >
                          <Typography variant="body1" sx={{ fontWeight: etablissement === opt.value ? 800 : 500, color: etablissement === opt.value ? "#6A1B9A" : "#333" }}>
                            {opt.label}
                          </Typography>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>

                {/* Nom */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nom de l'établissement *"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                    InputProps={{
                      startAdornment: (
                        <Box sx={{ pl: 1, pr: 1, display: "flex" }}>
                          <Store size={20} color="#6A1B9A" />
                        </Box>
                      ),
                    }}
                  />
                </Grid>

                {/* Téléphone */}
                <Grid item xs={12}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Phone size={20} color="#6A1B9A" />
                    <Box sx={{ flex: 1 }}>
                      <InputMask
                        key={country.phoneMask}
                        mask={country.phoneMask}
                        value={telephone}
                        onChange={(e) => setTelephone(e.value || "")}
                        placeholder={country.phoneExample}
                        style={{
                          width: "100%",
                          padding: "16.5px 14px",
                          fontSize: "1rem",
                          border: "1px solid #c4c4c4",
                          borderRadius: "4px",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                        onFocus={(e) => { e.target.style.borderColor = "#6A1B9A"; e.target.style.boxShadow = "0 0 0 1px #6A1B9A"; }}
                        onBlur={(e) => { e.target.style.borderColor = "#c4c4c4"; e.target.style.boxShadow = "none"; }}
                      />
                      <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
                        Numéro {country.name.toLowerCase()} à {country.phoneDigits} chiffres ({country.dialCode})
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Adresse - Carte GPS */}
                <Grid item xs={12}>
                  <Stack spacing={1.5}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 1 }}>
                      <MapPin size={18} color="#6A1B9A" /> Localisation du dépôt *
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Map />}
                      onClick={() => setOpenMapPicker(true)}
                      sx={{ alignSelf: "flex-start", fontWeight: 800, minWidth: 200, bgcolor: "#6A1B9A", "&:hover": { bgcolor: "#7E57C2" } }}
                    >
                      Choisir sur la carte
                    </Button>
                    {adresse ? (
                      <Alert severity="success" icon={<MapPin />} sx={{ borderRadius: 2 }}>
                        {adresse}
                        {adresseLat && adresseLng && (
                          <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.7 }}>
                            GPS: {adresseLat.toFixed(6)}, {adresseLng.toFixed(6)}
                          </Typography>
                        )}
                      </Alert>
                    ) : (
                      <Alert severity="info" icon={<MapPin />} sx={{ borderRadius: 2 }}>
                        Aucune position choisie. Clique sur le bouton ci-dessus pour localiser ton dépôt sur la carte.
                      </Alert>
                    )}
                    <TextField
                      fullWidth
                      label="Repère / details adresse"
                      value={adresse}
                      onChange={(e) => setAdresse(e.target.value)}
                      placeholder="Ex: Quartier, rue, repère..."
                      InputProps={{
                        startAdornment: (
                          <Box sx={{ pl: 1, pr: 1, display: "flex" }}>
                            <MapPin size={20} color="#6A1B9A" />
                          </Box>
                        ),
                      }}
                    />
                  </Stack>
                </Grid>

                <AddressMapPicker
                  open={openMapPicker}
                  lat={adresseLat}
                  lng={adresseLng}
                  country={country}
                  onClose={() => setOpenMapPicker(false)}
                  onConfirm={(addr, marker) => {
                    if (addr) setAdresse(addr);
                    if (marker) { setAdresseLat(marker[0]); setAdresseLng(marker[1]); }
                    setOpenMapPicker(false);
                  }}
                />

                {/* Submit */}
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={submitting}
                    endIcon={submitting ? null : <ChevronRight size={20} />}
                    sx={{
                      bgcolor: "#6A1B9A",
                      py: 1.5,
                      fontWeight: 700,
                      "&:hover": { bgcolor: "#7E57C2" },
                    }}
                  >
                    {submitting ? "Création en cours..." : "Créer mon dépôt"}
                  </Button>
                </Grid>

                {/* Help */}
                <Grid item xs={12}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1.5,
                      mt: 2,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Besoin d'aide ?
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "#6A1B9A", fontWeight: 600 }}
                    >
                      supportdepotmanager@gm-soft.ca
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
