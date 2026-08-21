import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  IconButton,
  Badge,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Paper,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@mui/material";
import { Plus, Search, X, ShoppingCart, Trash2, Minus, Share2 } from "lucide-react";
import { useTheme, useMediaQuery } from "@mui/material";
import { privateApi } from "../../../api/axios";
import { getActivePointDeVenteId } from "../../../utils/pdv";
import pushNotifications from "../../../utils/pushNotifications";
import {
  getCreePar,
  getConnectedRole,
  getConnectedClientId,
  syncClientSession,
  isClientBarUser,
} from "../../../utils/sessionAuth";

const CatalogueClientMobile = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  
  /* =========================
   ÉTATS
   ========================= */
  const [boissons, setBoissons] = useState([]);
  const [cart, setCart] = useState([]);
  const [itemQuantities, setItemQuantities] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commandeEnCours, setCommandeEnCours] = useState(false);
  const [modeRetrait, setModeRetrait] = useState("LIVRAISON");
  const [showCartModal, setShowCartModal] = useState(false);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [clientForm, setClientForm] = useState({
    raisonsociale: "",
    telephone: "",
  });
  
  /* =========================
   NOTIFICATIONS
   ========================= */
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success"
  });
  
  /* =========================
   FONCTIONS UTILITAIRES
   ========================= */
  const getToken = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      showNotification("Veuillez vous reconnecter", "error");
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
      return null;
    }
    return token;
  };
  
  const showNotification = (message, severity = "success") => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };
  
  /* =========================
   SESSION CLIENT (dmUser / JWT → localStorage)
   ========================= */
  useEffect(() => {
    syncClientSession();
  }, []);

  /* =========================
   PRODUITS (adapté bar / client)
   ========================= */
  useEffect(() => {
    const charger = async () => {
      setLoading(true);
      const pvId = getActivePointDeVenteId();
      const headers = pvId ? { "X-PV-ID": pvId } : {};
      const role = getConnectedRole();
      const endpoints = role === "CLIENT_BAR"
        ? ["/api/produits/client/catalogue"]
        : ["/api/produits"];
      try {
        let data = null;
        for (const ep of endpoints) {
          try {
            const res = await privateApi.get(ep, { headers });
            data = res.data;
            break;
          } catch (e) {
            // continue to next endpoint
          }
        }
        if (!data) throw new Error("Aucun produit récupéré");
        setBoissons(data || []);
        setError(null);
      } catch (err) {
        console.error("Erreur chargement produits:", err);
        setError("Impossible de charger les produits (vérifiez le point de vente actif)");
      } finally {
        setLoading(false);
      }
    };
    charger();
  }, []);
  
  /* =========================
   GESTION PANIER
   ========================= */
  const ajouterAuPanier = (boisson) => {
    const stockDisponible = boisson.stockInitial || 0;
    
    // Vérifier si le produit est en rupture de stock
    if (stockDisponible <= 0) {
      showNotification(`${boisson.designation} est en rupture de stock`, "error");
      return;
    }
    
    // Accepter les quantités décimales (ex: 2.5 casiers)
    const qteDemandee = Math.max(0.5, parseFloat(itemQuantities[boisson.id]) || 1);
    // Limiter à la quantité disponible
    const qte = Math.min(qteDemandee, stockDisponible);
    
    if (qte !== qteDemandee) {
      showNotification(`${stockDisponible} ${boisson.designation} disponible(s)`, "info");
    }
    
    const existantIndex = cart.findIndex(i => i.id === boisson.id);
    
    const consigne = (boisson.consigneBouteille || 0) * (boisson.nbBouteillesParCasier || 0) + (boisson.consigneCasier || 0);
    
    // Vérifier si on dépasserait le stock disponible en ajoutant au panier
    if (existantIndex !== -1) {
      const nouvelleQuantite = cart[existantIndex].quantite + qte;
      if (nouvelleQuantite > stockDisponible) {
        showNotification(`Stock insuffisant. Maximum ${stockDisponible} ${boisson.designation}`, "error");
        return;
      }
    }
    
    if (existantIndex !== -1) {
      const newCart = [...cart];
      newCart[existantIndex] = {
        ...newCart[existantIndex],
        quantite: parseFloat((newCart[existantIndex].quantite + qte).toFixed(2))
      };
      setCart(newCart);
    } else {
      setCart([...cart, {
        id: boisson.id,
        nom: boisson.designation,
        prix: boisson.prixVenteHt,
        consigne,
        consigneBouteille: boisson.consigneBouteille,
        consigneCasier: boisson.consigneCasier,
        nbBouteillesParCasier: boisson.nbBouteillesParCasier,
        quantite: qte
      }]);
    }
    
    // Réinitialiser la quantité pour ce produit
    setItemQuantities(prev => ({
      ...prev,
      [boisson.id]: 1
    }));
    
    showNotification(`${qte} × ${boisson.designation} ajouté au panier`, "success");
  };
  
  const retirerDuPanier = (id) => {
    const item = cart.find(i => i.id === id);
    if (item) {
      showNotification(`${item.nom} retiré du panier`, "info");
    }
    setCart(cart.filter(item => item.id !== id));
  };
  
  const modifierQuantite = (id, delta) => {
    const newCart = cart.map(item => {
      if (item.id === id) {
        const nouvelleQuantite = parseFloat((item.quantite + delta).toFixed(2));
        if (nouvelleQuantite < 0.1) {
          retirerDuPanier(id);
          return null;
        }
        return { ...item, quantite: nouvelleQuantite };
      }
      return item;
    }).filter(item => item !== null);
    
    setCart(newCart);
  };
  
  /* =========================
   CALCULS PANIER
   ========================= */
  const totalProduits = cart.reduce((sum, i) => sum + (i.prix * i.quantite), 0);
  const totalConsigne = cart.reduce((sum, i) => sum + (i.consigne * i.quantite), 0);
  const total = totalProduits + totalConsigne;

  /* =========================
   PARTAGE WHATSAPP
   ========================= */
  const buildWhatsappMessage = () => {
    const role = (localStorage.getItem("role") || "").toUpperCase();
    const includeConsigne = role === "CLIENT_BAR"; // commandes connectées uniquement
    const totalMessage = includeConsigne ? total : totalProduits;
    const modeLabel = modeRetrait === "LIVRAISON" ? "Livraison" : "Retrait sur place";
    const lignes = cart
      .map((i) => `${i.quantite}x ${i.nom} (${(i.prix || 0).toLocaleString("fr-FR")}F)`)
      .join("%0A");
    const consigneLine = includeConsigne && totalConsigne > 0 ? `%0AConsignes: ${totalConsigne.toLocaleString("fr-FR")} F` : "";
    const header = "Commande rapide";
    const mode = `Mode de récupération : ${modeLabel}`;
    const produitsLabel = lignes ? `%0AListe produits :%0A${lignes}` : "";
    const footer = `Total: ${totalMessage.toLocaleString("fr-FR")} F`;
    return `${header}%0A${mode}${produitsLabel}%0A${footer}${consigneLine}`;
  };

  const shareWhatsapp = () => {
    if (!cart.length) {
      showNotification("Panier vide, rien à partager", "warning");
      return;
    }
    const url = `https://wa.me/?text=${buildWhatsappMessage()}`;
    try {
      window.open(url, "_blank", "noopener");
      showNotification("Ouverture de WhatsApp…", "info");
    } catch (e) {
      navigator.clipboard?.writeText(decodeURIComponent(buildWhatsappMessage().replace(/%0A/g, "\n")));
      showNotification("Message copié, collez-le dans WhatsApp", "info");
    }
  };
  
  /* =========================
   VALIDATION COMMANDE
   ========================= */
  const validerCommande = async () => {
    if (cart.length === 0) {
      showNotification("Le panier est vide", "error");
      return;
    }
    setCommandeEnCours(true);
    
    try {
      const token = localStorage.getItem('token');
      const role = getConnectedRole();
      const clientId = getConnectedClientId();

      if (!token) {
        showNotification("Vous devez être connecté pour commander", "error");
        setCommandeEnCours(false);
        return;
      }

      // CLIENT_BAR : le backend identifie le client via le JWT (clientId dans le token)
      if (!clientId && !isClientBarUser()) {
        setShowCreateClient(true);
        setCommandeEnCours(false);
        return;
      }
      
      const pvId = getActivePointDeVenteId();
      
      // Construction du payload pour la commande
      const payload = {
        items: cart.map(item => {
          const cartItem = {
            produitId: item.id,
            quantite: item.quantite,
            prixUnitaire: item.prix
          };
          // 🔥 N'envoyer la consigne que si elle est définie et non nulle
          if (item.consigne != null && item.consigne !== 0) {
            cartItem.consigne = item.consigne;
          }
          return cartItem;
        }),
        modeRetrait: modeRetrait, // 🔥 Envoyer le mode de retrait
        creePar: getCreePar(),
      };
      
      // Choisir l'endpoint en fonction du rôle
      // Backend endpoint: /api/commandes/client (pas /creer)
      const endpoint = role === 'CLIENT_BAR'
        ? "/api/commandes/client"
        : "/api/commandes";

      const response = await privateApi.post(endpoint, payload, {
        headers: pvId ? { "X-PV-ID": pvId } : {}
      });
      
      // Envoyer la notification au gérant
      await pushNotifications.notifyGerantNouvelleCommande({
        commandeId: response.data?.id || commandeId,
        clientId: parseInt(clientId),
        clientNom: localStorage.getItem('lastName') ? 
                  `${localStorage.getItem('firstName') || ''} ${localStorage.getItem('lastName') || ''}`.trim() : 
                  (localStorage.getItem('firstName') || localStorage.getItem('lastName') || 'Client'),
        nombreProduits: cart.length,
        total: total,
        modeRetrait: modeRetrait
      });
      
      // Message de confirmation détaillé
      const commandeId = `CMD-${Date.now()}`;
      showNotification(
        `✅ Commande ${commandeId} enregistrée avec succès !\n📦 ${cart.length} produit(s) • ${modeRetrait === 'LIVRAISON' ? '🚚 Livraison' : '🏪 Retrait'}\n💰 Total: ${total.toLocaleString('fr-FR')} F`, 
        "success"
      );
      
      setCart([]);
      setItemQuantities({});
      setShowCartModal(false); // Fermer le panier après succès
    } catch (error) {
      console.error("Erreur commande:", error);
      const errorMsg = error.response?.data?.message || error.message || "Erreur lors de la création de la commande";
      showNotification(`❌ Erreur lors de l'enregistrement de la commande:\n${errorMsg}`, "error");
    } finally {
      setCommandeEnCours(false);
    }
  };

  const handleCreateClient = async () => {
    const pvId = getActivePointDeVenteId();
    if (!pvId) {
      showNotification("Point de vente actif manquant", "error");
      return;
    }
    if (!clientForm.raisonsociale.trim()) {
      showNotification("Nom du client obligatoire", "error");
      return;
    }
    try {
      const payload = {
        pointDeVenteId: pvId,
        raisonsociale: clientForm.raisonsociale.trim(),
        telephone: clientForm.telephone || null,
        categorieClient: "BAR",
        nomGerant: clientForm.raisonsociale.trim(),
      };
      const res = await privateApi.post("/api/clients/creer-rapide", payload, {
        headers: { "X-PV-ID": pvId },
      });
      const newClientId = res.data?.id;
      if (newClientId) {
        localStorage.setItem("clientId", newClientId);
        showNotification("Client créé et sélectionné", "success");
        setShowCreateClient(false);
      } else {
        showNotification("Client créé mais ID manquant", "warning");
      }
    } catch (e) {
      const msg =
        e.response?.data?.message ||
        "Impossible de créer le client";
      showNotification(msg, "error");
    }
  };

  const PanierItem = ({ item }) => (
    <Paper sx={{ display: "flex", alignItems: "center", p: 1, mb: 1, flexDirection: "column" }}>
      <Box sx={{ display: "flex", width: "100%", alignItems: "center" }}>
        <Box flex={1}>
          <Typography variant="body1" fontWeight="medium">
            {item.nom}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {item.prix} F + {((item.consigneBouteille || 0) * (item.nbBouteillesParCasier || 0) + (item.consigneCasier || 0))} F (consigne)
          </Typography>
        </Box>
        <IconButton 
          size="small" 
          color="error"
          onClick={() => retirerDuPanier(item.id)}
        >
          <Trash2 size={16} />
        </IconButton>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
        <IconButton 
          size="small" 
          onClick={() => modifierQuantite(item.id, -0.5)}
          disabled={item.quantite <= 0.5}
        >
          <Minus size={16} />
        </IconButton>
        <TextField
          type="number"
          size="small"
          value={item.quantite}
          onChange={(e) => {
            const newQte = parseFloat(e.target.value) || 0;
            if (newQte > 0) {
              const newCart = cart.map(i => 
                i.id === item.id ? { ...i, quantite: newQte } : i
              );
              setCart(newCart);
            }
          }}
          inputProps={{ 
            step: 0.5, 
            min: 0.5, 
            style: { textAlign: "center", width: "60px" } 
          }}
        />
        <IconButton 
          size="small" 
          onClick={() => modifierQuantite(item.id, 0.5)}
        >
          <Plus size={16} />
        </IconButton>
        <Typography sx={{ minWidth: "60px", textAlign: "right", fontWeight: "bold" }}>
          {(item.prix + ((item.consigneBouteille || 0) * (item.nbBouteillesParCasier || 0) + (item.consigneCasier || 0))) * item.quantite} F
        </Typography>
      </Box>
    </Paper>
  );
  
  const ResuméCommande = () => (
    <Box mt={2} p={2} bgcolor="#f8f9fa" borderRadius={1}>
      <Typography variant="subtitle2" gutterBottom>
        DÉTAIL DE LA COMMANDE
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="body2">Produits:</Typography>
        <Typography variant="body2" fontWeight="medium">{totalProduits} F</Typography>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="body2">Consignes:</Typography>
        <Typography variant="body2" fontWeight="medium">{totalConsigne} F</Typography>
      </Box>
      <Divider sx={{ my: 1 }} />
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="h6">TOTAL:</Typography>
        <Typography variant="h6" color="primary" fontWeight="bold">
          {total} F
        </Typography>
      </Box>
    </Box>
  );
  
  /* =========================
   RENDU PRINCIPAL
   ========================= */
  if (loading) {
    return (
      <Box height="100vh" display="flex" flexDirection="column" justifyContent="center" alignItems="center">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 3 }}>
          Chargement des produits...
        </Typography>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box height="100vh" display="flex" flexDirection="column" justifyContent="center" alignItems="center" p={3}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Réessayer
        </Button>
      </Box>
    );
  }
  
  return (
    <Box display="flex" height="100vh" flexDirection="column">
      {/* =========================
       HEADER AVEC PANIER COMPACT
       ========================= */}
      <Paper
        elevation={0}
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          p: 2,
          bgcolor: "white",
          borderBottom: "1px solid #e0e0e0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              component="img"
              src="/logo.svg"
              alt="DepotManager Logo"
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
              }}
            />
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Nouvelle Commande
            </Typography>
          </Box>
          <Badge badgeContent={cart.length} color="error">
            <Button
              variant="contained"
              startIcon={<ShoppingCart size={18} />}
              onClick={() => setShowCartModal(true)}
              sx={{
                bgcolor: "#673ab7",
                "&:hover": { bgcolor: "#5e35b1" },
                borderRadius: 2,
                px: 2,
                fontWeight: 700
              }}
            >
              Panier
            </Button>
          </Badge>
        </Box>

        {/* Recherche */}
        <TextField
          fullWidth
          placeholder="🔍 Rechercher un produit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 1.5,
              bgcolor: "white"
            }
          }}
          InputProps={{
            endAdornment: searchTerm ? (
              <IconButton size="small" onClick={() => setSearchTerm("")}>
                <X size={16} />
              </IconButton>
            ) : null
          }}
        />
      </Paper>

      {/* =========================
       PRODUITS (SCROLLABLE)
       ========================= */}
      <Box 
        flex={1} 
        p={2} 
        overflow="auto"
      >
        <Grid container spacing={2}>
          {boissons
            .filter(b =>
              b.designation.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map(b => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={b.id}>
                <Card 
                  elevation={2}
                  sx={{ 
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    transition: "transform 0.2s",
                    '&:hover': {
                      transform: "translateY(-4px)",
                      boxShadow: 4
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {b.designation}
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Prix: <strong>{b.prixVenteHt} F</strong>
                      </Typography>
                      {b.stockInitial !== undefined && (
                        <Typography variant="caption" color={b.stockInitial > 0 ? "success.main" : "error.main"} display="block">
                          Stock: <strong>{b.stockInitial}</strong> {b.stockInitial > 0 ? "disponible(s)" : "ÉPUISÉ"}
                        </Typography>
                      )}
                      {(b.consigneBouteille || b.consigneCasier) && (
                        <Typography variant="caption" color="primary" display="block">
                          Consigne: {(b.consigneBouteille || 0) * (b.nbBouteillesParCasier || 0) + (b.consigneCasier || 0)} F
                        </Typography>
                      )}
                    </Box>
                    
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          const currentQty = itemQuantities[b.id] || 1;
                          const newQty = Math.max(1, currentQty - 1);
                          setItemQuantities(prev => ({ ...prev, [b.id]: newQty }));
                        }}
                      >
                        <Minus size={16} />
                      </IconButton>
                      
                      <TextField
                        value={itemQuantities[b.id] || 1}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Allow only empty string or digits
                          if (val === '' || /^\d+$/.test(val)) {
                            const maxStock = b.stockInitial || 999;
                            setItemQuantities(prev => ({ ...prev, [b.id]: val === '' ? '' : Math.min(parseInt(val) || 1, maxStock) }));
                          }
                        }}
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (val === '' || val === '0') {
                            setItemQuantities(prev => ({ ...prev, [b.id]: 1 }));
                          } else {
                            const maxStock = b.stockInitial || 999;
                            const clamped = Math.min(Math.max(1, parseFloat(val) || 1), maxStock);
                            setItemQuantities(prev => ({ ...prev, [b.id]: clamped }));
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        size="small"
                        inputProps={{
                          inputMode: "decimal",
                          pattern: "[0-9]*\\.?[0-9]*",
                          style: { textAlign: "center" }
                        }}
                        sx={{
                          width: 90,
                          "& .MuiInputBase-input": { fontWeight: 900 }
                        }}
                      />
                      
                      <IconButton
                        size="small"
                        onClick={() => {
                          const currentQty = itemQuantities[b.id] || 1;
                          const newQty = currentQty + 1;
                          setItemQuantities(prev => ({ ...prev, [b.id]: newQty }));
                        }}
                      >
                        <Plus size={16} />
                      </IconButton>
                    </Box>
                    
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => ajouterAuPanier(b)}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    >
                      Ajouter
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
        </Grid>
      </Box>

      {/* =========================
       MODAL PANIER
       ========================= */}
      <Dialog
        open={showCartModal}
        onClose={() => setShowCartModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 1 }}>
              <ShoppingCart size={20} />
              Panier ({cart.length})
            </Typography>
            <IconButton onClick={() => setShowCartModal(false)}>
              <X size={20} />
            </IconButton>
          </Box>

          {cart.length === 0 ? (
            <Box textAlign="center" py={4}>
              <ShoppingCart size={48} color="#ccc" />
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                Votre panier est vide
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ maxHeight: 300, overflow: "auto", mb: 2 }}>
                {cart.map(item => (
                  <PanierItem key={item.id} item={item} />
                ))}
              </Box>

              <ResuméCommande />

              {/* 🔥 Sélection du mode de retrait */}
              <FormControl component="fieldset" sx={{ mt: 2 }}>
                <FormLabel>Mode de récupération</FormLabel>
                <RadioGroup
                  row
                  value={modeRetrait}
                  onChange={(e) => setModeRetrait(e.target.value)}
                >
                  <FormControlLabel 
                    value="LIVRAISON" 
                    control={<Radio size="small" />} 
                    label="🚚 Livraison" 
                  />
                  <FormControlLabel 
                    value="RETRAIT" 
                    control={<Radio size="small" />} 
                    label="🏪 Retrait en magasin" 
                  />
                </RadioGroup>
              </FormControl>

              <Button
                fullWidth
                variant="outlined"
                color="primary"
                size="large"
                onClick={shareWhatsapp}
                startIcon={<Share2 size={18} />}
                sx={{ mt: 1 }}
              >
                Partager via WhatsApp
              </Button>

              <Button
                fullWidth
                variant="contained"
                color="success"
                size="large"
                disabled={commandeEnCours}
                onClick={() => {
                  setShowCartModal(false);
                  validerCommande();
                }}
                sx={{ mt: 2, py: 1.5, fontWeight: 700 }}
              >
                {commandeEnCours ? (
                  <>
                    <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                    Traitement...
                  </>
                ) : (
                  `VALIDER LA COMMANDE (${total} F)`
                )}
              </Button>
            </>
          )}
        </Box>
      </Dialog>

      {/* Dialog création rapide client (bar non connecté en tant que client) */}
      <Dialog open={showCreateClient} onClose={() => setShowCreateClient(false)} fullWidth>
        <DialogTitle>Créer un client pour passer commande</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField
            label="Nom / Raison sociale"
            value={clientForm.raisonsociale}
            onChange={(e) =>
              setClientForm((prev) => ({ ...prev, raisonsociale: e.target.value }))
            }
            required
            fullWidth
          />
          <TextField
            label="Téléphone (optionnel)"
            value={clientForm.telephone}
            onChange={(e) =>
              setClientForm((prev) => ({ ...prev, telephone: e.target.value }))
            }
            fullWidth
          />
          <Alert severity="info">
            Le client sera créé dans votre point de vente puis sélectionné automatiquement pour cette commande.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateClient(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreateClient}>Créer et continuer</Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar pour les notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          <Typography component="pre" sx={{ whiteSpace: 'pre-line', margin: 0 }}>
            {snackbar.message}
          </Typography>
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CatalogueClientMobile;
