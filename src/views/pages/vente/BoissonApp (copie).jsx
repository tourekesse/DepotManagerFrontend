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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Chip,
  Paper
} from "@mui/material";
import { Plus, UserPlus, Search, X, ShoppingCart, Trash2, Minus } from "lucide-react";
import { useTheme, useMediaQuery } from "@mui/material";
import { publicApi } from "../../../api/axios";
import { getActivePointDeVenteId } from "../../../utils/pdv";

const BoissonApp = () => {
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
  const [venteEnCours, setVenteEnCours] = useState(false);
  
  /* =========================
   CLIENT
   ========================= */
  const [openClientModal, setOpenClientModal] = useState(false);
  const [clientSelectionne, setClientSelectionne] = useState(null);
  const [clientsExistants, setClientsExistants] = useState([]);
  const [clientForm, setClientForm] = useState({
    raisonsociale: "",
    telephone: "",
    categorieClient: "BAR",
    nomGerant: "",    // Pour les bars seulement
    prenom: "",       // Pour les personnes seulement (futur)
    cin: ""           // Pour les personnes seulement (futur)
  });
    // Charger la liste des clients existants au montage (PV dynamique via util)
    useEffect(() => {
      const token = getToken();
      if (!token) return;
      const pvId = getActivePointDeVenteId();
      if (!pvId) {
        showNotification("Point de vente introuvable. Veuillez sélectionner un point de vente.", "error");
        return;
      }
      fetch(`/api/clients?pointDeVenteId=${pvId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })
        .then(async res => {
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Erreur chargement clients: ${res.status} ${res.statusText} - ${errorText}`);
          }
          return res.json();
        })
        .then(data => {
          if (!Array.isArray(data) || data.length === 0) {
            showNotification("Aucun client trouvé dans la base de données", "warning");
          }
          setClientsExistants(data);
          console.log("Clients chargés:", data);
        })
        .catch(err => {
          console.error("Erreur chargement clients:", err);
          showNotification("Erreur lors du chargement des clients: " + err.message, "error");
          setClientsExistants([]);
        });
    }, []);
  
  /* =========================
   LIVREURS
   ========================= */
  const [livreurs, setLivreurs] = useState([]);
  const [livreurSelectionne, setLivreurSelectionne] = useState(null);

  // Charger la liste des livreurs au montage
  useEffect(() => {
    publicApi.get("/api/livreurs")
      .then(res => {
        setLivreurs(res.data);
      })
      .catch(() => {
        setLivreurs([]);
      });
  }, []);
  
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
   PRODUITS
   ========================= */
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    
    setLoading(true);
    fetch("/api/produits", {
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    })
      .then(res => {
        if (!res.ok) throw new Error(`Erreur ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then(data => {
        setBoissons(data);
        setLoading(false);
        setError(null);
      })
      .catch(err => {
        console.error("Erreur chargement produits:", err);
        setError("Impossible de charger les produits");
        setLoading(false);
      });
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
   CRÉATION CLIENT - LOGIQUE SIMPLIFIÉE
   ========================= */
  const validerEtChoisirClient = async () => {
    if (!clientForm.raisonsociale.trim()) {
      showNotification("Le nom du client est obligatoire", "error");
      return;
    }
    
    const token = getToken();
    if (!token) return;
    
    try {
      // 1. Préparer les données dynamiques pour le point de vente
      const pvId = getActivePointDeVenteId();
      if (!pvId) {
        showNotification("Point de vente introuvable. Veuillez sélectionner un point de vente.", "error");
        return;
      }
      // 2. Préparer les données COMME DANS LE CURL
      const payload = {
        pointDeVenteId: pvId, // ← OBLIGATOIRE
        raisonsociale: clientForm.raisonsociale,
        telephone: clientForm.telephone || "",
        categorieClient: clientForm.categorieClient,
      };
      // 3. Ajouter nomGerant si c'est un BAR
      if (clientForm.categorieClient === "BAR") {
        payload.nomGerant = clientForm.nomGerant || "";
      }
      // 4. Envoyer au BON endpoint
      const res = await fetch("/api/clients/creer-rapide", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload) // ← payload, pas clientForm !
      });
      if (!res.ok) {
        let message = "Erreur création client";
        try {
          const data = await res.json();
          message = data?.message || message;
        } catch (_) {
          try {
            const text = await res.text();
            message = text || message;
          } catch (_) {}
        }
        throw new Error(message);
      }
      const nouveauClient = await res.json();
      // 4. Fermer la modal
      setOpenClientModal(false);
      // 5. Sélectionner le client
      setClientSelectionne(nouveauClient);
      // 5b. L'ajouter immédiatement à la liste déroulante
      setClientsExistants(prev => {
        // éviter doublon si déjà présent
        const exists = prev.some(c => String(c.id) === String(nouveauClient.id));
        return exists ? prev : [nouveauClient, ...prev];
      });
      // 6. Réinitialiser
      setClientForm({ 
        raisonsociale: "", 
        telephone: "", 
        categorieClient: "BAR",
        nomGerant: "",
        prenom: "",
        cin: ""
      });
      // 7. Notification
      showNotification(`Client "${nouveauClient.raisonsociale}" créé !`, "success");
    } catch (error) {
      console.error("Erreur:", error);
      showNotification("Échec création client: " + error.message, "error");
    }
  };
  
  /* =========================
   VALIDATION VENTE
   ========================= */
  // Nouvelle fonction : enregistrement de la vente
  const validerVente = async () => {
    if (!clientSelectionne) {
      showNotification("Veuillez sélectionner ou créer un client", "error");
      return;
    }
    if (cart.length === 0) {
      showNotification("Le panier est vide", "error");
      return;
    }
    setVenteEnCours(true);
    const token = getToken();
    if (!token) {
      setVenteEnCours(false);
      return;
    }
    try {
      // Construction du payload attendu par le backend
      const payload = {
        clientId: clientSelectionne.id,
        articles: cart.map(item => ({
          produitId: item.id,
          uniteId: 1, // À adapter si tu gères plusieurs unités
          quantite: item.quantite,
          prixUnitaire: item.prix
        })),
        montantPaye: 0, // Force le paiement à crédit
        montantVidesRendus: 0, // à adapter si tu gères les vides
        livreurId: livreurSelectionne ? livreurSelectionne.id : null
      };
      const res = await fetch("/api/ventes/directe", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Erreur lors de l'enregistrement de la vente");
      }
      const vente = await res.json();
      showNotification("Vente enregistrée avec succès !", "success");
      setCart([]);
    } catch (error) {
      console.error("Erreur vente:", error);
      showNotification("Erreur lors de l'enregistrement de la vente: " + error.message, "error");
    } finally {
      setVenteEnCours(false);
    }
  };

  // Correction : composant PanierItem (supposé) doit retourner un JSX valide
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
  
  const ResuméVente = () => (
    <Box mt={2} p={2} bgcolor="#f8f9fa" borderRadius={1}>
      <Typography variant="subtitle2" gutterBottom>
        DÉTAIL DE LA VENTE
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
    <Box display="flex" height="100vh" flexDirection={isMobile ? "column" : "row"}>
      {/* =========================
       PRODUITS
       ========================= */}
      <Box 
        flex={1} 
        p={isMobile ? 1 : 2} 
        overflow="auto"
        sx={{ pb: isMobile ? "200px" : 0 }}
      >
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Rechercher un produit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <Search size={16} style={{ marginRight: 8 }} />,
              endAdornment: searchTerm && (
                <IconButton onClick={() => setSearchTerm("")} size="small">
                  <X size={16} />
                </IconButton>
              )
            }}
            variant="outlined"
            size={isMobile ? "small" : "medium"}
          />
          
          <Chip 
            label={`${boissons.length} produits`} 
            size="small" 
            color="primary" 
            variant="outlined"
            sx={{ mt: 1 }}
          />
        </Box>
        
        <Grid container spacing={isMobile ? 1 : 2}>
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
                      {typeof b.nbBouteillesParCasier !== 'undefined' && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Nb bouteilles : {b.nbBouteillesParCasier}
                        </Typography>
                      )}
                    </Box>
                    
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                      <Typography variant="body2">Quantité:</Typography>
                      <TextField
                        type="number"
                        size="small"
                        value={itemQuantities[b.id] || 1}
                        onChange={(e) => {
                          const value = Math.max(1, parseInt(e.target.value) || 1);
                          setItemQuantities({
                            ...itemQuantities,
                            [b.id]: value
                          });
                        }}
                        sx={{ width: "80px" }}
                        inputProps={{ min: 1 }}
                      />
                    </Box>
                    
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<Plus size={18} />}
                      onClick={() => ajouterAuPanier(b)}
                      size={isMobile ? "small" : "medium"}
                    >
                      Ajouter au panier
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
        </Grid>
      </Box>
      
      {/* =========================
       PANIER / CLIENT
       ========================= */}
      <Box 
        sx={{ 
          width: isMobile ? "100%" : 380,
          height: isMobile ? "auto" : "100vh",
          position: isMobile ? "fixed" : "relative",
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: "#fff",
          borderLeft: isMobile ? "none" : "1px solid #ddd",
          boxShadow: isMobile ? 3 : 0,
          zIndex: 1000,
          display: "flex",
          flexDirection: "column"
        }}
      >
        <Box p={2} flex={1} overflow="auto">
          {/* CLIENT */}
          <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: "#f8f9fa" }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle1" fontWeight="bold">
                Client
              </Typography>
              <IconButton 
                onClick={() => setOpenClientModal(true)} 
                size="small"
                color="primary"
              >
                <UserPlus size={18} />
              </IconButton>
            </Box>
            {/* Combo de sélection des clients existants */}
            <TextField
              select
              fullWidth
              label="Sélectionner un client existant"
              value={clientSelectionne ? clientSelectionne.id : ""}
              onChange={e => {
                const id = e.target.value;
                const client = clientsExistants.find(c => String(c.id) === String(id));
                setClientSelectionne(client || null);
              }}
              SelectProps={{ native: true }}
              sx={{ mb: 2 }}
            >
              <option value="">-- Aucun --</option>
              {clientsExistants.map(client => (
                <option key={client.id} value={client.id}>
                  {client.raisonsociale} {client.telephone ? `(${client.telephone})` : ""}
                </option>
              ))}
            </TextField>
            {clientSelectionne ? (
              <Box>
                <Typography fontWeight="bold" color="success.main">
                  {clientSelectionne.raisonsociale}
                </Typography>
                {clientSelectionne.telephone && (
                  <Typography variant="caption" display="block">
                    📞 {clientSelectionne.telephone}
                  </Typography>
                )}
                <Chip 
                  label={clientSelectionne.categorieClient} 
                  size="small" 
                  sx={{ mt: 0.5 }}
                />
              </Box>
            ) : (
              <Typography color="error" variant="body2">
                ⚠️ Aucun client sélectionné
              </Typography>
            )}
          </Paper>
          
          <Divider sx={{ my: 2 }} />
          
          {/* LIVREUR */}
          <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: "#f8f9fa" }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle1" fontWeight="bold">
                Livreur
              </Typography>
            </Box>
            <TextField
              select
              fullWidth
              label="Sélectionner un livreur"
              value={livreurSelectionne ? livreurSelectionne.id : ""}
              onChange={e => {
                const id = e.target.value;
                const livreur = livreurs.find(l => String(l.id) === String(id));
                setLivreurSelectionne(livreur || null);
              }}
              SelectProps={{ native: true }}
              sx={{ mb: 2 }}
            >
              <option value="">-- Aucun --</option>
              {livreurs.map(livreur => (
                <option key={livreur.id} value={livreur.id}>
                  {livreur.firstName} {livreur.lastName} {livreur.phoneNumber ? `(${livreur.phoneNumber})` : ""}
                </option>
              ))}
            </TextField>
            {livreurSelectionne ? (
              <Box>
                <Typography fontWeight="bold" color="info.main">
                  {livreurSelectionne.firstName} {livreurSelectionne.lastName}
                </Typography>
                {livreurSelectionne.phoneNumber && (
                  <Typography variant="caption" display="block">
                    📞 {livreurSelectionne.phoneNumber}
                  </Typography>
                )}
              </Box>
            ) : (
              <Typography color="error" variant="body2">
                ⚠️ Aucun livreur sélectionné
              </Typography>
            )}
          </Paper>
          
          {/* 🛒 PANIER */}
          <Box sx={{ mb: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <ShoppingCart size={20} />
              <Typography variant="h6" fontWeight="bold">
                Panier
              </Typography>
              <Badge 
                badgeContent={cart.length} 
                color="primary" 
                sx={{ ml: 1 }}
              />
              {cart.length > 0 && (
                <Button 
                  size="small" 
                  color="error" 
                  onClick={() => setCart([])}
                  sx={{ ml: "auto" }}
                >
                  Vider
                </Button>
              )}
            </Box>
            
            {cart.length === 0 ? (
              <Box textAlign="center" py={3}>
                <ShoppingCart size={48} color="#ccc" />
                <Typography color="text.secondary" sx={{ mt: 2 }}>
                  Votre panier est vide
                </Typography>
              </Box>
            ) : (
              <Box>
                {cart.map(item => (
                  <PanierItem key={item.id} item={item} />
                ))}
              </Box>
            )}
          </Box>
        </Box>
        
        {/* ZONE DE VALIDATION */}
        <Box p={2} borderTop="1px solid #eee" bgcolor="#fff">
          {cart.length > 0 && <ResuméVente />}
          
          <Button
            fullWidth
            variant="contained"
            color="success"
            size="large"
            disabled={cart.length === 0 || venteEnCours}
            onClick={validerVente}
            sx={{ mt: 2, py: 1.5 }}
          >
            {venteEnCours ? (
              <>
                <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                Traitement en cours...
              </>
            ) : (
              `VALIDER LA VENTE (${total} F)`
            )}
          </Button>
          
          {cart.length > 0 && (
            <Typography variant="caption" display="block" textAlign="center" sx={{ mt: 1 }}>
              {cart.reduce((sum, item) => sum + item.quantite, 0)} article(s) dans le panier
            </Typography>
          )}
        </Box>
      </Box>
      
      {/* =========================
       MODAL CLIENT - SIMPLIFIÉE
       ========================= */}
      <Dialog 
        open={openClientModal} 
        onClose={() => {
          setOpenClientModal(false);
          setClientForm({ raisonsociale: "", telephone: "", categorieClient: "BAR" });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <UserPlus size={20} />
            <span>Nouveau client</span>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Créez un nouveau client. Il sera automatiquement sélectionné pour la vente en cours.
          </Alert>
          
          <TextField
            fullWidth
            label="Nom / Raison sociale *"
            required
            value={clientForm.raisonsociale}
            onChange={(e) =>
              setClientForm({ ...clientForm, raisonsociale: e.target.value })
            }
            sx={{ mb: 2 }}
            placeholder="Ex : MAQUIS ZENITH, M. KOUADIO, CAVE JJ…"
            autoFocus
          />
          
          <TextField
            fullWidth
            label="Téléphone"
            value={clientForm.telephone}
            onChange={(e) =>
              setClientForm({ ...clientForm, telephone: e.target.value })
            }
            sx={{ mb: 2 }}
          />
          {/* Champ conditionnel pour les bars */}
          {clientForm.categorieClient === "BAR" && (
            <TextField
              fullWidth
              label="Nom du gérant (optionnel)"
              value={clientForm.nomGerant}
              onChange={(e) =>
                setClientForm({ ...clientForm, nomGerant: e.target.value })
              }
              sx={{ mb: 2 }}
            />
          )}
          
          <TextField
            fullWidth
            select
            SelectProps={{ native: true }}
            label="Type client"
            value={clientForm.categorieClient}
            onChange={(e) =>
              setClientForm({ ...clientForm, categorieClient: e.target.value })
            }
          >
            <option value="BAR">Bar / Maquis</option>
            <option value="PERSONNE">Personne</option>
          </TextField>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => {
              setOpenClientModal(false);
              setClientForm({ raisonsociale: "", telephone: "", categorieClient: "BAR" });
            }}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={validerEtChoisirClient}
            disabled={!clientForm.raisonsociale.trim()}
          >
            Créer et sélectionner
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* =========================
       NOTIFICATIONS
       ========================= */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert 
          severity={snackbar.severity} 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BoissonApp;