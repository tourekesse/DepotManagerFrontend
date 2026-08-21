import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Grid,
  Divider,
  Paper,
  Chip,
  IconButton,
  Autocomplete,
  Tabs,
  Tab,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import BoltIcon from "@mui/icons-material/Bolt";
import EditNoteIcon from "@mui/icons-material/EditNote";
import SearchIcon from "@mui/icons-material/Search";
import RemoveIcon from "@mui/icons-material/Remove";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ResumeDuJour from "./ResumeDuJour";
import { privateApi } from "../../../api/axios";
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";
import { useUser } from "../../../context/UserContext";
import UpgradeIcon from "@mui/icons-material/TrendingUp";
import { setCache, getCache, enqueue, flushQueue } from "../../../utils/offline";
import { formatCurrency } from "../../../utils/currencyUtils";

const formatAmount = (v) => formatCurrency(v);
const productLabel = (p) => p?.designation || p?.nomProduit || "";
const productPrice = (p) => Number(p?.prixVenteHt ?? p?.prixVente ?? 0);

export default function BarVente() {
  const notifications = useNotifications();
  const { user } = useUser();
  const role = (user?.role || "").replace(/\s+/g, "_").toUpperCase();
  const canSeeBenefice =
    role.startsWith("PROPRIETAIRE") || role.startsWith("ADMIN");
  const [needsUpgrade, setNeedsUpgrade] = React.useState(false);
  const [upgrading, setUpgrading] = React.useState(false);

  const [mode, setMode] = React.useState("rapide"); // "rapide" | "detail"

  const [produits, setProduits] = React.useState([]);
  const [loadingProduits, setLoadingProduits] = React.useState(false);
  const [catalogueFilter, setCatalogueFilter] = React.useState("");
  const [catActive, setCatActive] = React.useState("Tous");
  const [saving, setSaving] = React.useState(false);

  // Caisse rapide : ticket = { produitId: qty }
  const [ticket, setTicket] = React.useState({});

  // Saisie détaillée
  const [lignes, setLignes] = React.useState([{ produit: null, quantite: "" }]);
  const [resume, setResume] = React.useState({
    totalVente: 0,
    totalCout: 0,
    benefice: 0,
    lignes: [],
  });

  const CATALOG_CACHE_KEY = "barCatalogCache";
  const OFFLINE_QUEUE_KEY = "barOfflineSales";
  const OFFLINE_RESUME_KEY = "barOfflineResume";

  const cacheCatalog = (data) => setCache(CATALOG_CACHE_KEY, data || []);
  const loadCatalogCache = () => getCache(CATALOG_CACHE_KEY, []);
  const enqueueOfflineSale = (payload) => enqueue(OFFLINE_QUEUE_KEY, payload);
  const flushOfflineQueue = async () => {
    const synced = await flushQueue(OFFLINE_QUEUE_KEY, (payload) =>
      privateApi.post("/api/bar/ventes", payload)
    );
    if (synced) {
      notifications.show("Ventes hors ligne synchronisées", { severity: "success" });
      loadResume();
    }
  };

  const loadProduits = React.useCallback(async () => {
    try {
      setLoadingProduits(true);
      const endpoint =
        role === "CLIENT_BAR"
          ? "/api/produits/client/catalogue"
          : "/api/produits";
      const res = await privateApi.get(endpoint);
      setProduits(res.data || []);
      cacheCatalog(res.data || []);
    } catch (e) {
      const msg =
        e.response?.data?.message ||
        e.response?.data?.error ||
        "Erreur de chargement des produits";
      notifications.show(msg, { severity: "error" });
      if (e.response?.status === 401 || e.response?.status === 403) {
        setNeedsUpgrade(true);
      } else {
        const cached = loadCatalogCache();
        if (cached.length) {
          setProduits(cached);
          notifications.show("Catalogue chargé depuis le cache (offline)", {
            severity: "info",
          });
        }
      }
    } finally {
      setLoadingProduits(false);
    }
  }, [notifications, role]);

  const loadResume = React.useCallback(async () => {
    try {
      const res = await privateApi.get("/api/bar/ventes/jour");
      setResume(res.data || { totalVente: 0, totalCout: 0, benefice: 0, lignes: [] });
      try {
        localStorage.setItem(OFFLINE_RESUME_KEY, JSON.stringify(res.data || {}));
      } catch (_e) {}
    } catch (e) {
      const cached = localStorage.getItem(OFFLINE_RESUME_KEY);
      if (cached) {
        setResume(JSON.parse(cached));
        notifications.show("Résumé chargé depuis le cache (offline)", {
          severity: "info",
        });
      } else {
        notifications.show("Erreur lors du chargement du résumé", {
          severity: "error",
        });
      }
    }
  }, [notifications]);

  React.useEffect(() => {
    loadProduits();
    loadResume();
  }, [loadProduits, loadResume]);

  React.useEffect(() => {
    const handler = () => {
      if (navigator.onLine) {
        flushOfflineQueue();
      }
    };
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  }, []);

  const saveSale = async (payloadLignes) => {
    if (!payloadLignes.length) {
      notifications.show("Ajoute au moins un produit et une quantité", {
        severity: "warning",
      });
      return false;
    }
    const payload = { lignes: payloadLignes };
    setSaving(true);
    try {
      if (!navigator.onLine) {
        enqueueOfflineSale(payload);
        notifications.show("Vente stockée offline, synchro dès retour réseau", {
          severity: "info",
        });
      } else {
        await privateApi.post("/api/bar/ventes", payload);
        notifications.show("Vente bar enregistrée", { severity: "success" });
      }
      loadResume();
      return true;
    } catch (e) {
      const msg =
        e.response?.data?.message ||
        e.message ||
        "Impossible d'enregistrer la vente bar";
      notifications.show(msg, { severity: "error" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const payloadLignes = lignes
      .filter((l) => l.produit && l.quantite > 0)
      .map((l) => ({
        produitId: l.produit.id,
        quantite: Number(l.quantite),
      }));
    const ok = await saveSale(payloadLignes);
    if (ok) {
      setLignes([{ produit: null, quantite: "" }]);
    }
  };

  // ----- Caisse rapide -----
  const categories = React.useMemo(() => {
    const set = new Set();
    produits.forEach((p) => {
      const g = p?.groupeLiquide?.trim();
      if (g) set.add(g);
    });
    return ["Tous", ...Array.from(set)];
  }, [produits]);

  const filteredProduits = React.useMemo(() => {
    let list = produits;
    if (catActive !== "Tous") {
      list = list.filter((p) => (p?.groupeLiquide || "").trim() === catActive);
    }
    const q = catalogueFilter.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => productLabel(p).toLowerCase().includes(q));
    }
    return list;
  }, [produits, catActive, catalogueFilter]);

  const ticketItems = React.useMemo(() => {
    return Object.entries(ticket)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => {
        const p = produits.find((x) => String(x.id) === String(id));
        return { produit: p, qty: q, total: q * productPrice(p) };
      })
      .filter((x) => x.produit);
  }, [ticket, produits]);

  const ticketTotal = ticketItems.reduce((s, i) => s + i.total, 0);

  const addToTicket = (p) => {
    const id = String(p.id);
    setTicket((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const decFromTicket = (id, qty) => {
    setTicket((prev) => {
      const nextQty = (qty || 0) - 1;
      const copy = { ...prev };
      if (nextQty <= 0) delete copy[id];
      else copy[id] = nextQty;
      return copy;
    });
  };

  const clearTicket = () => setTicket({});

  const handleEncaisser = async () => {
    const payloadLignes = ticketItems.map(({ produit, qty }) => ({
      produitId: produit.id,
      quantite: qty,
    }));
    const ok = await saveSale(payloadLignes);
    if (ok) setTicket({});
  };

  // ----- Saisie détaillée -----
  const handleAddLigne = () => {
    setLignes((prev) => [...prev, { produit: null, quantite: "" }]);
  };

  const handleRemoveLigne = (index) => {
    setLignes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChangeProduit = (index, value) => {
    setLignes((prev) =>
      prev.map((ligne, i) => (i === index ? { ...ligne, produit: value } : ligne))
    );
  };

  const handleChangeQuantite = (index, value) => {
    if (value === "") {
      setLignes((prev) =>
        prev.map((ligne, i) => (i === index ? { ...ligne, quantite: "" } : ligne))
      );
      return;
    }

    const numeric = parseInt(value, 10);
    const qty = Number.isNaN(numeric) ? "" : Math.max(1, numeric);
    setLignes((prev) =>
      prev.map((ligne, i) => (i === index ? { ...ligne, quantite: qty } : ligne))
    );
  };

  const decodeJwt = () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;
      const payload = token.split(".")[1];
      return JSON.parse(atob(payload));
    } catch (_e) {
      return null;
    }
  };

  const handleUpgrade = async () => {
    const payload = decodeJwt();
    const clientId = payload?.clientId;
    if (!clientId) {
      notifications.show("Impossible de trouver le clientId (token manquant ou invalide)", {
        severity: "error",
      });
      return;
    }
    try {
      setUpgrading(true);
      const res = await privateApi.post("/api/clients/upgrade-to-pv", {
        clientId,
      });
      const pvId = res.data?.pointDeVenteId;
      if (pvId) {
        localStorage.setItem(
          "activePV",
          JSON.stringify({ id: pvId, nom: res.data?.pointDeVenteNom })
        );
        notifications.show("Upgrade effectué. PV actif défini, rechargement...", {
          severity: "success",
        });
        setTimeout(() => window.location.reload(), 800);
      } else {
        notifications.show("Upgrade réalisé, mais PV non retourné", { severity: "warning" });
      }
    } catch (e) {
      const msg =
        e.response?.data?.message ||
        e.response?.data?.error ||
        "Impossible d'effectuer l'upgrade";
      notifications.show(msg, { severity: "error" });
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <ShoppingCartIcon color="primary" />
        <Typography variant="h5" fontWeight={800}>
          Vente Bar
        </Typography>
        <Chip label="Saisie rapide" color="primary" variant="outlined" />
      </Stack>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={mode} onChange={(_, m) => setMode(m)}>
          <Tab icon={<BoltIcon />} iconPosition="start" label="Caisse rapide" value="rapide" />
          <Tab icon={<EditNoteIcon />} iconPosition="start" label="Saisie détaillée" value="detail" />
        </Tabs>
      </Box>

      {needsUpgrade ? (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Upgrade requis pour vendre
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Passe en point de vente pour activer la vente bar et ton inventaire.
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<UpgradeIcon />}
              onClick={handleUpgrade}
              disabled={upgrading}
            >
              {upgrading ? "Upgrade..." : "Upgrade en PV"}
            </Button>
          </CardContent>
        </Card>
      ) : mode === "rapide" ? (
        <Grid container spacing={2}>
          {/* Colonne caisse */}
          <Grid item xs={12} md={7}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Rechercher une boisson..."
                    value={catalogueFilter}
                    onChange={(e) => setCatalogueFilter(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Box sx={{ maxWidth: "100%" }}>
                    {categories.map((cat) => (
                      <Button
                        key={cat}
                        size="small"
                        variant={catActive === cat ? "contained" : "outlined"}
                        onClick={() => setCatActive(cat)}
                        sx={{ mr: 1, mb: 1, textTransform: "none" }}
                      >
                        {cat}
                      </Button>
                    ))}
                  </Box>
                  <Divider />
                </Stack>

                <Box sx={{ mt: 2 }}>
                  {loadingProduits && (
                    <Typography variant="body2" color="text.secondary">
                      Chargement du catalogue...
                    </Typography>
                  )}
                  {!loadingProduits && filteredProduits.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Aucun produit dans cette liste.
                    </Typography>
                  )}
                  <Grid container spacing={1.5}>
                    {filteredProduits.map((p) => {
                      const qty = ticket[String(p.id)] || 0;
                      return (
                        <Grid item xs={6} sm={4} key={p.id}>
                          <Paper
                            variant="outlined"
                            onClick={() => addToTicket(p)}
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              cursor: "pointer",
                              textAlign: "center",
                              position: "relative",
                              borderColor: qty > 0 ? "#667eea" : undefined,
                              bgcolor: qty > 0 ? "#eef0ff" : "#fff",
                              transition: "transform 0.06s",
                              "&:hover": { transform: "scale(1.02)" },
                              "&:active": { transform: "scale(0.97)" },
                            }}
                          >
                            {qty > 0 && (
                              <Chip
                                label={qty}
                                size="small"
                                color="primary"
                                sx={{ position: "absolute", top: -8, right: -4 }}
                              />
                            )}
                            <Typography
                              sx={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2, minHeight: 32 }}
                            >
                              {productLabel(p)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatAmount(productPrice(p))}
                            </Typography>
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Colonne ticket */}
          <Grid item xs={12} md={5}>
            <Card sx={{ position: "sticky", top: 8 }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h6" fontWeight={700}>
                    Ticket
                  </Typography>
                  {ticketItems.length > 0 && (
                    <IconButton size="small" onClick={clearTicket} color="inherit">
                      <ClearAllIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>

                {ticketItems.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Touchez les produits pour les ajouter.
                  </Typography>
                )}

                <Stack spacing={1} sx={{ maxHeight: 300, overflow: "auto" }}>
                  {ticketItems.map(({ produit: p, qty }) => (
                    <Paper key={p.id} variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {productLabel(p)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatAmount(productPrice(p))} × {qty}
                          </Typography>
                        </Box>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <IconButton
                            size="small"
                            onClick={() => decFromTicket(p.id, qty)}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography sx={{ fontWeight: 700, minWidth: 24, textAlign: "center" }}>
                            {qty}
                          </Typography>
                          <IconButton size="small" onClick={() => addToTicket(p)}>
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                        <Typography sx={{ fontWeight: 700, minWidth: 80, textAlign: "right" }}>
                          {formatAmount(productPrice(p) * qty)}
                        </Typography>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>

                <Divider sx={{ my: 1.5 }} />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" fontWeight={800}>
                    Total
                  </Typography>
                  <Typography variant="h6" fontWeight={800} color="primary">
                    {formatAmount(ticketTotal)}
                  </Typography>
                </Stack>

                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                  sx={{ mt: 1.5 }}
                  disabled={ticketItems.length === 0 || saving}
                  onClick={handleEncaisser}
                  startIcon={<ShoppingCartIcon />}
                >
                  {saving ? "Encaissement..." : "Encaisser"}
                </Button>

                <Accordion sx={{ mt: 2 }} defaultExpanded={false}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      📊 Résumé du jour
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 0, pb: 0 }}>
                    <ResumeDuJour resume={resume} canSeeBenefice={canSeeBenefice} />
                  </AccordionDetails>
                </Accordion>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <Typography variant="h6" fontWeight={700}>
                    Saisie des lignes
                  </Typography>
                  <Chip label="Unité auto: Bouteille/Canette" size="small" />
                </Stack>
                <Stack spacing={2}>
                  {lignes.map((ligne, index) => (
                    <Paper
                      key={index}
                      variant="outlined"
                      sx={{ p: 2, borderRadius: 2, position: "relative" }}
                    >
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <Autocomplete
                          fullWidth
                          options={produits}
                          loading={loadingProduits}
                          getOptionLabel={productLabel}
                          value={ligne.produit}
                          onChange={(_, value) => handleChangeProduit(index, value)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Produit"
                              placeholder="Rechercher une boisson"
                            />
                          )}
                        />
                        <TextField
                          type="number"
                          label="Quantité"
                          value={ligne.quantite}
                          onChange={(e) => handleChangeQuantite(index, e.target.value)}
                          sx={{ width: { xs: "100%", sm: 140 } }}
                          inputProps={{ min: 1 }}
                          placeholder="Ex: 1"
                        />
                        <IconButton
                          color="error"
                          onClick={() => handleRemoveLigne(index)}
                          disabled={lignes.length === 1}
                          sx={{ alignSelf: { xs: "flex-end", sm: "center" } }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </Paper>
                  ))}
                  <Button
                    startIcon={<AddIcon />}
                    onClick={handleAddLigne}
                    variant="text"
                    size="small"
                  >
                    Ajouter une ligne
                  </Button>
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mt={3}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSubmit}
                    disabled={saving}
                    startIcon={<ShoppingCartIcon />}
                    sx={{ flex: 1 }}
                  >
                    {saving ? "Enregistrement..." : "Enregistrer la vente"}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            <ResumeDuJour resume={resume} canSeeBenefice={canSeeBenefice} />
          </Grid>
        </Grid>
      )}
    </Box>
  );
}