// ============================================================================
// CLIENT VENTE PAGE - Interface simplifiée pour clients bar
// ============================================================================
// Cette page est utilisée par les clients connectés (CLIENT_BAR) pour passer
// directement leurs commandes sans passer par le processus de création
// de client ou de sélection client.
// ============================================================================

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Badge,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Paper,
  useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Plus,
  ShoppingCart,
  Trash2,
  Minus,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Search
} from "lucide-react";
import { publicApi, privateApi } from "../../../api/axios";

// Decode JWT without external library
const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

// Hook debounce personnalisé
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const formatFcfa = (n) => `${Number(n || 0).toLocaleString("fr-FR")} F CFA`;
const clamp = (v, min = 1) => {
  const x = parseFloat(String(v ?? ""));
  if (Number.isNaN(x)) return min;
  return Math.max(min, x);
};

const calcConsigne = (p) =>
  (p.consigneBouteille || 0) * (p.nbBouteillesParCasier || 0) + (p.consigneCasier || 0);

// ============================================================================
// LIGNE PRODUIT
// ============================================================================
const ProduitRow = ({ produit, quantite, setQuantite, onAdd, isAdding }) => {
  const [tempQty, setTempQty] = useState(String(quantite));
  const consigne = calcConsigne(produit);

  useEffect(() => setTempQty(String(quantite)), [quantite]);

  const handleBlur = () => {
    const val = tempQty.trim();
    if (val === '' || val === '0') {
      setQuantite(1);
      setTempQty('1');
    } else {
      const clamped = clamp(val, 1);
      setQuantite(clamped);
      setTempQty(String(clamped));
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 2, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
      <Box sx={{ flex: 1, minWidth: 180 }}>
        <Typography sx={{ fontWeight: 900 }} noWrap>{produit.designation}</Typography>
        <Typography variant="caption" color="text.secondary">
          Prix: <b>{formatFcfa(produit.prixVenteHt)}</b>
          {consigne > 0 && <> • Consigne: <b>{formatFcfa(consigne)}</b></>}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <IconButton size="small" onClick={() => setQuantite(Math.max(1, quantite - 1))}>
          <Minus size={16} />
        </IconButton>
        <TextField
          value={tempQty}
          onChange={(e) => { const v = e.target.value; if (v === '' || /^\d+(\.\d{0,2})?$/.test(v)) setTempQty(v); }}
          onBlur={handleBlur}
          onFocus={(e) => e.target.select()}
          size="small"
          inputProps={{ inputMode: "decimal", style: { textAlign: "center", width: 50 } }}
        />
        <IconButton size="small" onClick={() => setQuantite(quantite + 1)}>
          <Plus size={16} />
        </IconButton>

        <Button
          variant="contained"
          size="small"
          disabled={isAdding}
          onClick={() => { handleBlur(); onAdd(); }}
          sx={{ borderRadius: 2, fontWeight: 900, minWidth: 80 }}
        >
          {isAdding ? <><CircularProgress size={14} sx={{ mr: 0.5 }} /> Ajouté!</> : "Ajouter"}
        </Button>
      </Box>
    </Paper>
  );
};

// ============================================================================
// PAGE PRINCIPALE
// ============================================================================
const ClientVentePage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // États
  const [produits, setProduits] = useState([]);
  const [cart, setCart] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [addingId, setAddingId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [showCart, setShowCart] = useState(false);
  const [clientInfo, setClientInfo] = useState(null);
  const [pvId, setPvId] = useState(null);

  const debouncedSearch = useDebounce(search, 300);

  // Récupérer les infos du client depuis le token JWT
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setClientInfo({
          name: decoded.sub?.split("@")[0] || "Client",
          role: decoded.role
        });
        
        // Récupérer le PV du client via l'API
        fetchClientPv(token);
      } catch (e) {
        console.error("Erreur décodage token:", e);
      }
    }
  }, []);

  // Récupérer le point de vente du client
  const fetchClientPv = async (token) => {
    try {
      const res = await fetch("/api/produits/client/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.pointDeVenteId) setPvId(data.pointDeVenteId);
    } catch (e) {
      console.error("Erreur récupération PV client:", e);
    }
  };

  // Charger les produits du catalogue fournisseur
  useEffect(() => {
    const loadProduits = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch("/api/produits/client/catalogue", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error("Erreur chargement produits");
        const data = await res.json();
        setProduits(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setSnackbar({ open: true, message: "Erreur chargement produits", severity: "error" });
      } finally {
        setLoading(false);
      }
    };

    loadProduits();
  }, []);

  // Filtrer les produits
  const produitsFiltres = produits.filter(p =>
    p.designation?.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  // Gestion du panier
  const addToCart = (produit) => {
    const qty = quantities[produit.id] || 1;
    setCart(prev => {
      const existing = prev.find(i => i.id === produit.id);
      if (existing) {
        return prev.map(i => i.id === produit.id ? { ...i, qty: i.qty + qty } : i);
      }
      return [...prev, { ...produit, qty }];
    });
    setAddingId(produit.id);
    setTimeout(() => setAddingId(null), 1000);
    setSnackbar({ open: true, message: `${produit.designation} ajouté`, severity: "success" });
  };

  const updateCartQty = (id, qty) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i).filter(i => i.qty > 0));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  // Calculer le total
  const total = cart.reduce((sum, item) => sum + (item.prixVenteHt * item.qty), 0);

  // Passer la commande
  const passerCommande = async () => {
    if (cart.length === 0) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/commandes/client", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map(i => ({
            produitId: i.id,
            quantite: i.qty,
            prixUnitaire: i.prixVenteHt
          })),
          pointDeVenteId: pvId
        })
      });

      if (!res.ok) throw new Error("Erreur lors de la commande");

      setCart([]);
      setSnackbar({ open: true, message: "Commande passée avec succès !", severity: "success" });
    } catch (e) {
      setSnackbar({ open: true, message: e.message, severity: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 2, maxWidth: 800, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          Commande - {clientInfo?.name || "Client"}
        </Typography>
        <IconButton onClick={() => setShowCart(true)}>
          <Badge badgeContent={cart.length} color="primary">
            <ShoppingCart />
          </Badge>
        </IconButton>
      </Box>

      {/* Recherche */}
      <TextField
        fullWidth
        placeholder="Rechercher un produit..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{ startAdornment: <Search size={18} style={{ marginRight: 8 }} /> }}
      />

      {/* Liste des produits */}
      {loading ? (
        <Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box>
      ) : (
        <Box>
          {produitsFiltres.length === 0 ? (
            <Alert severity="info">Aucun produit trouvé</Alert>
          ) : (
            produitsFiltres.map(produit => (
              <ProduitRow
                key={produit.id}
                produit={produit}
                quantite={quantities[produit.id] || 1}
                setQuantite={q => setQuantities({ ...quantities, [produit.id]: q })}
                onAdd={() => addToCart(produit)}
                isAdding={addingId === produit.id}
              />
            ))
          )}
        </Box>
      )}

      {/* Modal Panier */}
      <Dialog open={showCart} onClose={() => setShowCart(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Votre panier</DialogTitle>
        <DialogContent>
          {cart.length === 0 ? (
            <Typography>Aucun article dans le panier</Typography>
          ) : (
            <Box>
              {cart.map(item => (
                <Box key={item.id} sx={{ display: "flex", justifyContent: "space-between", py: 1, borderBottom: "1px solid #eee" }}>
                  <Box>
                    <Typography>{item.designation}</Typography>
                    <Typography variant="caption">{formatFcfa(item.prixVenteHt)} x {item.qty}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <IconButton size="small" onClick={() => updateCartQty(item.id, item.qty - 1)}>
                      <Minus size={14} />
                    </IconButton>
                    <Typography>{item.qty}</Typography>
                    <IconButton size="small" onClick={() => updateCartQty(item.id, item.qty + 1)}>
                      <Plus size={14} />
                    </IconButton>
                    <IconButton size="small" onClick={() => removeFromCart(item.id)}>
                      <Trash2 size={14} />
                    </IconButton>
                  </Box>
                </Box>
              ))}
              <Typography variant="h6" sx={{ mt: 2, textAlign: "right" }}>
                Total: {formatFcfa(total)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCart(false)}>Continuer</Button>
          <Button variant="contained" onClick={passerCommande} disabled={cart.length === 0 || submitting}>
            {submitting ? <CircularProgress size={18} /> : "Passer la commande"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} onClose={() => setSnackbar({ ...snackbar, open: false })} autoHideDuration={3000}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ClientVentePage;