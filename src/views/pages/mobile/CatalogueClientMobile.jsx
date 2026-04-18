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
   PRODUITS (adapté bar / client)
   ========================= */
  useEffect(() => {
    const charger = async () => {
      setLoading(true);
      const pvId = getActivePointDeVenteId();
      const headers = pvId ? { "X-PV-ID": pvId } : {};
      // Si un rôle client est présent, on tente d'abord le catalogue client
      const role = (localStorage.getItem("role") || "").toUpperCase();
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
    const qte = Math.max(1, itemQuantities[boisson.id] || 1);
    const existantIndex = cart.findIndex(i => i.id === boisson.id);
    
    const consigne = (boisson.consigneBouteille || 0) * (boisson.nbBouteillesParCasier || 0) + (boisson.consigneCasier || 0);
    
    if (existantIndex !== -1) {
      const newCart = [...cart];
      newCart[existantIndex] = {
        ...newCart[existantIndex],
        quantite: newCart[existantIndex].quantite + qte
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
        const nouvelleQuantite = item.quantite + delta;
        if (nouvelleQuantite < 1) {
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
      // Vérifier que le client est connecté
      const token = localStorage.getItem('token');
      let clientId = localStorage.getItem('clientId');
      const role = (localStorage.getItem('role') || '').toUpperCase();
      
      if (!token) {
        showNotification("Vous devez être connecté pour commander", "error");
        setCommandeEnCours(false);
        return;
      }
      if (!clientId) {
        setShowCreateClient(true);
        setCommandeEnCours(false);
        return;
      }
      
      const pvId = getActivePointDeVenteId();
      
      // Construction du payload pour la commande
      const payload = {
        clientId: parseInt(clientId),
        pointDeVenteId: pvId || 0,
        typePaiement: "CREDIT", // ou "ESPECES" selon votre besoin
        modeRetrait: modeRetrait,
        lignes: cart.map(item => ({
          produitId: item.id,
          quantite: item.quantite,
          prixUnitaire: item.prix
        }))
      };
      
      // Choisir l'endpoint en fonction du rôle
      const endpoint = role === 'CLIENT_BAR'
        ? "/api/commandes/client/creer"
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
    <Paper sx={{ display: "flex", alignItems: "center", p: 1, mb: 1 }}>
      <Box flex={1}>
        <Typography variant="body1" fontWeight="medium">
          {item.nom}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {item.prix} F + {((item.consigneBouteille || 0) * (item.nbBouteillesParCasier || 0) + (item.consigneCasier || 0))} F (consigne)
        </Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <IconButton 
          size="small" 
          onClick={() => modifierQuantite(item.id, -1)}
          disabled={item.quantite <= 1}
        >
          <Minus size={16} />
        </IconButton>
        <Typography sx={{ minWidth: "24px", textAlign: "center" }}>
          {item.quantite}
        </Typography>
        <IconButton 
          size="small" 
          onClick={() => modifierQuantite(item.id, 1)}
        >
          <Plus size={16} />
        </IconButton>
        <Typography sx={{ minWidth: "60px", textAlign: "right", fontWeight: "bold" }}>
          {(item.prix + ((item.consigneBouteille || 0) * (item.nbBouteillesParCasier || 0) + (item.consigneCasier || 0))) * item.quantite} F
        </Typography>
        <IconButton 
          size="small" 
          color="error"
          onClick={() => retirerDuPanier(item.id)}
        >
          <Trash2 size={16} />
        </IconButton>
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
                            setItemQuantities(prev => ({ ...prev, [b.id]: val === '' ? '' : parseInt(val) || 1 }));
                          }
                        }}
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (val === '' || val === '0') {
                            setItemQuantities(prev => ({ ...prev, [b.id]: 1 }));
                          } else {
                            const clamped = Math.max(1, parseInt(val) || 1);
                            setItemQuantities(prev => ({ ...prev, [b.id]: clamped }));
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        size="small"
                        inputProps={{
                          inputMode: "numeric",
                          pattern: "[0-9]*",
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
