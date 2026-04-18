import React from "react";
import {
  Box,
  Typography,
  IconButton,
  Button,
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  X,
} from "lucide-react";

const formatF = (n) => `${Number(n || 0).toLocaleString("fr-FR")} F`;

const CartModal = ({
  open,
  onClose,
  cart,
  totalProduits,
  totalConsigne,
  total,
  modifierQuantitePanier,
  retirerDuPanier,
  clientSelectionne,
  validerVente,
  venteEnCours
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ShoppingCart size={20} />
          <Typography variant="h6">Mon Panier</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {cart.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography color="text.secondary">Votre panier est vide</Typography>
          </Box>
        ) : (
          <>
            {cart.map((item, index) => {
              // Adapter les champs venant de la base de données
              const nom = item.nom_produit || item.nom || "Produit inconnu";
              const prix = Number(item.prix_unitaire || item.prix || 0);
              const quantite = Number(item.quantite || 1);
              const consigneBouteille = Number(item.consigne_bouteille || item.consigneBouteille || 0);
              const consigneCasier = Number(item.consigne_casier || item.consigneCasier || 0);
              const consigneTotale = consigneBouteille + consigneCasier;
              
              return (
                <Box key={item.id || index} sx={{ p: 2, borderBottom: "1px solid #eee" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {nom}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatF(prix)} × {quantite}
                      </Typography>
                      {consigneTotale > 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
                          + Emballages (consigne): {formatF(consigneTotale)}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => modifierQuantitePanier(item.id || item.produit_id, -1)}
                        disabled={item.quantite <= 1}
                      >
                        <Minus size={16} />
                      </IconButton>
                      <Typography sx={{ minWidth: "30px", textAlign: "center" }}>
                        {item.quantite}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => modifierQuantitePanier(item.id || item.produit_id, 1)}
                      >
                        <Plus size={16} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => retirerDuPanier(item.id || item.produit_id)}
                        sx={{ color: "error.main" }}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              );
            })}

            {/* Résumé du panier */}
            <Box sx={{ p: 2, bgcolor: "#f5f5f5", borderTop: "2px solid #e0e0e0" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75, fontSize: "0.9rem" }}>
                <span>Produits:</span>
                <strong>{formatF(totalProduits)}</strong>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75, fontSize: "0.9rem" }}>
                <span>Emballages:</span>
                <strong>{formatF(totalConsigne)}</strong>
              </Box>

              {/* Total */}
              <Box sx={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 900,
                fontSize: "1.1rem",
                pt: 1,
                borderTop: "2px dashed #ccc",
                color: "#1976d2"
              }}>
                <span>TOTAL COMMANDE:</span>
                <span>{formatF(total)}</span>
              </Box>
            </Box>
          </>
        )}
      </DialogContent>

      {cart.length > 0 && (
        <DialogActions sx={{ p: 2, pt: 0, display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={async () => {
              if (window.confirm("Vider le panier ?")) {
                try {
                  const token = localStorage.getItem('token');
                  if (!token) return;
                  
                  const clientId = clientSelectionne?.id;
                  const pvId = window.pvId; // TODO: passer pvId en prop
                  
                  if (clientId && pvId) {
                    const res = await fetch(`/api/panier/vider/${clientId}/${pvId}`, {
                      method: "DELETE",
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    
                    if (res.ok) {
                      window.location.reload(); // Recharger pour actualiser le panier
                    }
                  }
                } catch (error) {
                  console.error("Erreur vidage panier:", error);
                }
              }
            }}
            sx={{ flex: 1 }}
          >
            Vider
          </Button>
          <Button
            variant="contained"
            onClick={validerVente}
            disabled={venteEnCours || !clientSelectionne}
            sx={{
              flex: 2,
              bgcolor: "#1976d2",
              "&:hover": { bgcolor: "#1565c0" },
              "&:disabled": { bgcolor: "#ccc" }
            }}
          >
            {venteEnCours ? "Enregistrement..." : "Enregistrer la commande"}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default CartModal;
