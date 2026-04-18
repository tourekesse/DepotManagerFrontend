import React, { useState, useEffect } from "react";
import {
  Badge,
  IconButton,
  Box,
  Typography,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { ShoppingCart } from "lucide-react";

const PanierWidget = ({ cart, onClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  
  const [animate, setAnimate] = useState(false);

  // Animation quand le panier change
  useEffect(() => {
    if (cart.length > 0) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 300);
      return () => clearTimeout(timer);
    }
  }, [cart.length]);

  const totalItems = cart.reduce((sum, item) => sum + item.quantite, 0);
  const total = cart.reduce((sum, item) => sum + item.prix * item.quantite, 0);

  const formatF = (nombre) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
      minimumFractionDigits: 0,
    }).format(nombre);

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: isMobile ? 16 : 32,
        right: isMobile ? 16 : 32,
        zIndex: 1000,
      }}
    >
      <Tooltip 
        title={`Panier: ${totalItems} article${totalItems > 1 ? "s" : ""} - ${formatF(total)}`}
        arrow
      >
        <IconButton
          onClick={onClick}
          sx={{
            bgcolor: "#1976d2",
            color: "white",
            width: isMobile ? 56 : 64,
            height: isMobile ? 56 : 64,
            boxShadow: "0 4px 12px rgba(25, 118, 210, 0.4)",
            "&:hover": {
              bgcolor: "#1565c0",
              boxShadow: "0 6px 16px rgba(25, 118, 210, 0.6)",
              transform: "scale(1.05)",
            },
            transition: "all 0.2s ease",
            animation: animate ? "pulse 0.3s ease" : "none",
            "@keyframes pulse": {
              "0%": { transform: "scale(1)" },
              "50%": { transform: "scale(1.2)" },
              "100%": { transform: "scale(1)" },
            },
          }}
        >
          <Badge
            badgeContent={totalItems}
            color="error"
            max={99}
            sx={{
              "& .MuiBadge-badge": {
                fontSize: isMobile ? "0.6rem" : "0.7rem",
                height: isMobile ? 16 : 20,
                minWidth: isMobile ? 16 : 20,
              },
            }}
          >
            <ShoppingCart size={isMobile ? 24 : 28} />
          </Badge>
        </IconButton>
      </Tooltip>

      {/* Indicateur de prix en dessous */}
      {cart.length > 0 && (
        <Box
          sx={{
            position: "absolute",
            bottom: -24,
            right: 0,
            bgcolor: "rgba(0, 0, 0, 0.8)",
            color: "white",
            px: 1,
            py: 0.5,
            borderRadius: 1,
            fontSize: "0.7rem",
            whiteSpace: "nowrap",
          }}
        >
          {formatF(total)}
        </Box>
      )}
    </Box>
  );
};

export default PanierWidget;
