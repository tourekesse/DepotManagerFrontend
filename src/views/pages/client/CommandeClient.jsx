import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  Snackbar,
  AppBar,
  Toolbar,
} from "@mui/material";
import { Search, Plus, Minus, ShoppingCart, Trash2, ArrowLeft } from "lucide-react";
import { privateApi } from "../../../api/axios";

const CART_KEY = "dmCartClient";

export default function CommandeClient() {
  const navigate = useNavigate();
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("LIVRAISON");
  const [adresse, setAdresse] = useState(() => localStorage.getItem("dmAdresseClient") || "");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const showNotification = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  /* =========================
   Charger produits
   ========================= */
  useEffect(() => {
    const fetchProduits = async () => {
      try {
        const res = await privateApi.get("/api/produits");
        setProduits(res.data || []);
        setError("");
      } catch (err) {
        setError("Impossible de charger les produits");
      } finally {
        setLoading(false);
      }
    };
    fetchProduits();
  }, []);

  /* =========================
   Persistance panier
   ========================= */
  useEffect(() => {
    const stored = localStorage.getItem(CART_KEY);
    if (stored) {
      try {
        setCart(JSON.parse(stored));
      } catch (_) {
        setCart([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  /* =========================
   Helpers panier
   ========================= */
  const addToCart = (product) => {
    const qty = Math.max(1, quantities[product.id] || 1);
    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, quantite: p.quantite + qty } : p
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          nom: product.designation,
          prix: product.prixVenteHt,
          consigne:
            (product.consigneBouteille || 0) * (product.nbBouteillesParCasier || 0) +
            (product.consigneCasier || 0),
          quantite: qty,
        },
      ];
    });
    setQuantities((prev) => ({ ...prev, [product.id]: 1 }));
    showNotification(`${qty} × ${product.designation} ajouté au panier ✓`, "success");
  };

  const updateQty = (id, delta) => {
    setCart((prev) => {
      const next = prev
        .map((item) => {
          if (item.id !== id) return item;
          const q = item.quantite + delta;
          if (q < 1) return null;
          return { ...item, quantite: q };
        })
        .filter(Boolean);
      return next;
    });
  };

  const removeItem = (id) => {
    const item = cart.find((i) => i.id === id);
    if (item) {
      showNotification(`${item.nom} retiré du panier`, "info");
    }
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const totals = useMemo(() => {
    const totalProduits = cart.reduce((sum, i) => sum + i.prix * i.quantite, 0);
    const totalConsigne = cart.reduce((sum, i) => sum + i.consigne * i.quantite, 0);
    return {
      totalProduits,
      totalConsigne,
      total: totalProduits + totalConsigne,
    };
  }, [cart]);

  const filteredProduits = useMemo(() => {
    if (!search.trim()) return produits;
    const term = search.toLowerCase();
    return produits.filter((p) =>
      [p.designation, p.categorie, p.typeBoisson]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term))
    );
  }, [produits, search]);

  /* =========================
   Soumission commande
   ========================= */
  const submitCommande = async () => {
    if (cart.length === 0) {
      setError("Panier vide");
      return;
    }
    if (mode === "LIVRAISON" && !adresse.trim()) {
      setError("Adresse requise pour la livraison");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        mode,
        adresse: mode === "LIVRAISON" ? adresse.trim() : "",
        notes: notes.trim(),
        lignes: cart.map((item) => ({ produitId: item.id, quantite: item.quantite })),
      };
      await privateApi.post("/api/commandes", payload);
      setCart([]);
      localStorage.removeItem(CART_KEY);
      if (mode === "LIVRAISON") {
        localStorage.setItem("dmAdresseClient", adresse.trim());
      }
      setNotes("");
      showNotification("✅ Commande envoyée avec succès !", "success");
    } catch (err) {
      const errMsg = err.response?.data?.message || "Échec de l'envoi de la commande";
      setError(errMsg);
      showNotification(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================
   UI
   ========================= */
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5" }}>
      {/* Header avec bouton retour */}
      <AppBar position="static" sx={{ bgcolor: "#059669" }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => navigate('/espace-client')} sx={{ mr: 1 }}>
            <ArrowLeft size={20} />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: "bold" }}>
            Nouvelle Commande
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Box maxWidth={1200} mx="auto">
        <Box textAlign="center" mb={3}>
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{
              background: "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            🛒 Commander des boissons
          </Typography>
          <Typography color="text.secondary">
            Choisissez vos produits, validez le panier puis confirmez en livraison ou retrait.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Card sx={{ mb: 3, borderRadius: 3, boxShadow: "0 12px 30px rgba(0,0,0,0.08)" }}>
          <CardContent>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
              <Box sx={{ flex: 1, display: "flex", gap: 1, alignItems: "center" }}>
                <Search size={18} />
                <TextField
                  fullWidth
                  placeholder="Rechercher une boisson..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  size="small"
                />
              </Box>
              <Stack direction="row" spacing={1}>
                {[
                  { key: "LIVRAISON", label: "Livraison" },
                  { key: "RETRAIT", label: "Retrait" },
                ].map((m) => (
                  <Chip
                    key={m.key}
                    label={m.label}
                    color={mode === m.key ? "primary" : "default"}
                    onClick={() => setMode(m.key)}
                    variant={mode === m.key ? "filled" : "outlined"}
                  />
                ))}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
          <Box flex={1}>
            {loading ? (
              <Box display="flex" justifyContent="center" py={6}>
                <CircularProgress />
              </Box>
            ) : filteredProduits.length === 0 ? (
              <Typography color="text.secondary">Aucun produit trouvé.</Typography>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
                  gap: 2,
                }}
              >
                {filteredProduits.map((p) => (
                  <Card
                    key={p.id}
                    sx={{
                      borderRadius: 3,
                      boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
                      background: "rgba(255,255,255,0.95)",
                    }}
                  >
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                        {p.designation}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {p.typeBoisson || p.categorie || "Boisson"}
                      </Typography>
                      <Typography variant="h6" fontWeight={700} mt={1}>
                        {p.prixVenteHt} F
                      </Typography>
                      {p.consigneCasier || p.consigneBouteille ? (
                        <Typography variant="caption" color="text.secondary">
                          Consigne incluse
                        </Typography>
                      ) : null}

                      <Stack direction="row" alignItems="center" spacing={1} mt={2}>
                        <IconButton
                          size="small"
                          onClick={() =>
                            setQuantities((prev) => ({
                              ...prev,
                              [p.id]: Math.max(1, (prev[p.id] || 1) - 1),
                            }))
                          }
                        >
                          <Minus size={16} />
                        </IconButton>
                        <Typography width={32} textAlign="center">
                          {quantities[p.id] || 1}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() =>
                            setQuantities((prev) => ({
                              ...prev,
                              [p.id]: (prev[p.id] || 1) + 1,
                            }))
                          }
                        >
                          <Plus size={16} />
                        </IconButton>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => addToCart(p)}
                          sx={{ ml: "auto" }}
                        >
                          Ajouter
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>

          <Box width={{ xs: "100%", lg: 360 }}>
            <Card
              sx={{
                position: "sticky",
                top: 20,
                borderRadius: 3,
                boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
                background: "rgba(255,255,255,0.98)",
              }}
            >
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <ShoppingCart size={18} />
                  <Typography fontWeight={700}>Panier</Typography>
                  <Chip label={`${cart.length} articles`} size="small" sx={{ ml: "auto" }} />
                </Stack>

                {cart.length === 0 ? (
                  <Typography color="text.secondary">Ajoutez des produits.</Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {cart.map((item) => (
                      <Paper key={item.id} variant="outlined" sx={{ p: 1.2, borderRadius: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box flex={1}>
                            <Typography fontWeight={600}>{item.nom}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.prix} F {item.consigne ? `+ ${item.consigne} F consigne` : ""}
                            </Typography>
                          </Box>
                          <IconButton size="small" onClick={() => updateQty(item.id, -1)} disabled={item.quantite <= 1}>
                            <Minus size={16} />
                          </IconButton>
                          <Typography width={28} textAlign="center">{item.quantite}</Typography>
                          <IconButton size="small" onClick={() => updateQty(item.id, 1)}>
                            <Plus size={16} />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => removeItem(item.id)}>
                            <Trash2 size={14} />
                          </IconButton>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}

                <Divider sx={{ my: 2 }} />

                {mode === "LIVRAISON" && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      📍 Adresse de livraison
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      minRows={2}
                      value={adresse}
                      onChange={(e) => setAdresse(e.target.value)}
                      placeholder="Quartier, rue, repère..."
                      size="small"
                    />
                  </Box>
                )}

                <Box mb={2}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    📝 Notes
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Appeler à l'arrivée"
                    size="small"
                  />
                </Box>

                <Stack spacing={0.5} mb={2}>
                  <Typography display="flex" justifyContent="space-between">
                    <span>Sous-total</span>
                    <b>{totals.totalProduits} F</b>
                  </Typography>
                  <Typography display="flex" justifyContent="space-between">
                    <span>Consignes</span>
                    <b>{totals.totalConsigne} F</b>
                  </Typography>
                  <Typography display="flex" justifyContent="space-between" fontWeight={700}>
                    <span>Total</span>
                    <span>{totals.total} F</span>
                  </Typography>
                </Stack>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={cart.length === 0 || (mode === "LIVRAISON" && !adresse.trim()) || submitting}
                  onClick={submitCommande}
                  sx={{
                    background: "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
                    boxShadow: "0 10px 24px rgba(16,185,129,0.35)",
                  }}
                >
                  {submitting ? <CircularProgress size={22} color="inherit" /> : "✅ Confirmer la commande"}
                </Button>
              </CardContent>
            </Card>
          </Box>
        </Stack>
        </Box>
      </Box>

      {/* SNACKBAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
}
