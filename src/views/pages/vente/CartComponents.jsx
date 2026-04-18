import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Badge,
  Paper,
  Divider,
  Alert,
  TextField,
  Chip,
  CircularProgress,
  Modal,
  Fade
} from "@mui/material";
import { ShoppingCart, CheckCircle2, Printer, X, Minus, Plus, Trash2 } from "lucide-react";

const formatF = (n) => `${Number(n || 0).toLocaleString("fr-FR")} F`;

/* =========================
   MODAL: CONFIRMATION AJOUT PANIER (Style eBay mobile)
========================= */
export const CartNotification = ({ open, message, onClose, item }) => {
  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeAfterTransition
      slotProps={{
        backdrop: { timeout: 300 }
      }}
    >
      <Fade in={open}>
        <Box
          sx={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            width: "90%",
            maxWidth: "400px",
            bgcolor: "white",
            borderRadius: 3,
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            p: 2,
            zIndex: 9999,
            animation: "slideUp 0.3s ease-out"
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Icône de confirmation */}
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: "#4caf50",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              <CheckCircle2 size={24} color="white" />
            </Box>

            {/* Message */}
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#333" }}>
                ✅ Ajouté au panier
              </Typography>
              {item && (
                <Typography sx={{ fontSize: "0.85rem", color: "#666", mt: 0.25 }}>
                  {item.quantite} × {item.nom}
                </Typography>
              )}
            </Box>

            {/* Bouton OK */}
            <Button
              variant="contained"
              size="small"
              onClick={onClose}
              sx={{
                bgcolor: "#ff5722",
                color: "white",
                fontWeight: 700,
                borderRadius: 2,
                px: 2,
                "&:hover": {
                  bgcolor: "#f4511e"
                }
              }}
            >
              OK
            </Button>
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
};

/* =========================
   COMPOSANT CART BUBBLE (Style eBay mobile flottant)
========================= */
export const CartBubble = ({ count, total, onClick }) => {
  if (count === 0) return null;

  return (
    <Box
      onClick={onClick}
      sx={{
        position: "fixed",
        bottom: 100,
        right: 20,
        zIndex: 1000,
        cursor: "pointer",
        animation: "bounceIn 0.5s ease-out"
      }}
    >
      {/* Badge avec compteur */}
      <Badge
        badgeContent={count}
        color="error"
        sx={{
          "& .MuiBadge-badge": {
            fontSize: "0.75rem",
            fontWeight: 900,
            width: 24,
            height: 24,
            borderRadius: "50%"
          }
        }}
      >
        {/* Cercle principal */}
        <Box
          sx={{
            width: 56,
            height: 56,
            bgcolor: "white",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            border: "2px solid #1976d2",
            transition: "all 0.3s ease",
            "&:hover": {
              transform: "scale(1.1)",
              boxShadow: "0 6px 20px rgba(25,118,210,0.3)"
            }
          }}
        >
          <ShoppingCart size={24} color="#1976d2" />
        </Box>
      </Badge>

      {/* Étiquette avec le total */}
      <Paper
        sx={{
          position: "absolute",
          top: -10,
          right: 60,
          px: 1.5,
          py: 0.75,
          borderRadius: 2,
          bgcolor: "#1976d2",
          color: "white",
          fontWeight: 700,
          fontSize: "0.85rem",
          whiteSpace: "nowrap",
          boxShadow: "0 2px 8px rgba(25,118,210,0.3)",
          animation: "slideIn 0.3s ease-out"
        }}
      >
        {formatF(total)}
      </Paper>
    </Box>
  );
};

/* =========================
   MODAL: SUCCESS CONFIRMATION (Style eBay)
========================= */
export const SuccessConfirmation = ({ 
  open, 
  onClose, 
  venteResultat,
  handlePrintReceipt,
  handleWhatsAppShare
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      closeAfterTransition
      slotProps={{
        backdrop: { timeout: 500 }
      }}
    >
      <Fade in={open}>
        <Box
          sx={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "90%",
            maxWidth: "500px",
            bgcolor: "white",
            borderRadius: 3,
            boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
            overflow: "hidden"
          }}
        >
          {/* Header avec animation */}
          <Box
            sx={{
              p: 3,
              bgcolor: "#4caf50",
              color: "white",
              textAlign: "center",
              position: "relative",
              overflow: "hidden"
            }}
          >
            <CheckCircle2 size={64} color="white" />
            <Typography variant="h5" sx={{ mt: 2, fontWeight: 900, letterSpacing: 1 }}>
              COMMANDE CONFIRMÉE !
            </Typography>
            <Typography sx={{ mt: 1, opacity: 0.9 }}>
              Votre commande a été enregistrée avec succès
            </Typography>
          </Box>

          {/* Contenu */}
          <Box sx={{ p: 3 }}>
            {/* Numéro de commande */}
            <Paper
              sx={{
                p: 2,
                mb: 3,
                bgcolor: "#f5f5f5",
                borderRadius: 2,
                border: "1px dashed #4caf50"
              }}
            >
              <Typography variant="caption" sx={{ color: "#666", display: "block", mb: 0.5 }}>
                Numéro de commande
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: "#4caf50" }}>
                #{venteResultat?.venteId || "-"}
              </Typography>
            </Paper>

            {/* Résumé */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "#333" }}>
                RÉSUMÉ DE LA COMMANDE
              </Typography>
              
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <span>Total produits:</span>
                <strong>{formatF(venteResultat?.totalProduits || 0)}</strong>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <span>Emballages:</span>
                <strong>{formatF(venteResultat?.totalConsigne || 0)}</strong>
              </Box>
              {venteResultat?.montantVidesRendus > 0 && (
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1, color: "#ff9800" }}>
                  <span>Vides rendus:</span>
                  <strong>- {formatF(venteResultat?.montantVidesRendus || 0)}</strong>
                </Box>
              )}
              
              <Divider sx={{ my: 1.5 }} />
              
              <Box sx={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                p: 1.5,
                bgcolor: "#e8f5e9",
                borderRadius: 1
              }}>
                <Typography sx={{ fontWeight: 900, fontSize: "1.1rem" }}>
                  TOTAL COMMANDE
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: "#4caf50" }}>
                  {formatF(venteResultat?.total || 0)}
                </Typography>
              </Box>
            </Box>

            {/* Boutons d'actions */}
            <Box sx={{ 
              display: "grid", 
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, 
              gap: 1.5,
              mb: 2
            }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handlePrintReceipt}
                startIcon={<Printer size={18} />}
                sx={{
                  py: 1.5,
                  fontWeight: 700,
                  borderColor: "#2196f3",
                  color: "#2196f3",
                  "&:hover": {
                    borderColor: "#1976d2",
                    bgcolor: "rgba(33,150,243,0.04)"
                  }
                }}
              >
                Imprimer
              </Button>
              
              <Button
                fullWidth
                variant="contained"
                onClick={handleWhatsAppShare}
                startIcon={<Box component="span" sx={{ fontSize: "1.2rem" }}>📱</Box>}
                sx={{
                  py: 1.5,
                  fontWeight: 700,
                  bgcolor: "#25d366",
                  "&:hover": {
                    bgcolor: "#1da851"
                  }
                }}
              >
                Partager
              </Button>
            </Box>

            {/* Bouton terminer */}
            <Button
              fullWidth
              variant="contained"
              onClick={onClose}
              sx={{
                py: 1.5,
                fontWeight: 900,
                bgcolor: "#333",
                "&:hover": {
                  bgcolor: "#000"
                }
              }}
            >
              Terminer
            </Button>
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
};
