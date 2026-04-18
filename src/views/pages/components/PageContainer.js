import * as React from "react";
import { Box, Button, Typography, Stack, Tooltip } from "@mui/material";

export default function ProductBulkSummaryBar({
  products = [],
  loading = false,
  onSubmit,
  onReset,
}) {
  const totalProduits = Array.isArray(products) ? products.length : 0;

  // VALIDATION : On vérifie si un produit sélectionné a un prix à 0 ou vide
  const isInvalid = products.some(p => 
    !p.prixAchat || Number(p.prixAchat) <= 0 || 
    !p.prixVente || Number(p.prixVente) <= 0
  );

  if (totalProduits === 0) return null;

  return (
    <Box
      sx={{
        p: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        bgcolor: "#f8f9fa",
        borderBottom: "1px solid #eee",
      }}
    >
      <Stack>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#1a237e", fontSize: '0.85rem' }}>
          {totalProduits} PRODUIT(S) SÉLECTIONNÉ(S)
        </Typography>
        {isInvalid && (
          <Typography variant="caption" color="error" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
            ⚠️ Prix d'achat/vente obligatoires (min > 0)
          </Typography>
        )}
      </Stack>

      <Stack direction="row" spacing={1.5}>
        <Button 
          variant="text" 
          color="inherit" 
          size="small"
          disabled={loading}
          onClick={onReset}
          sx={{ fontSize: '0.75rem', fontWeight: 600 }}
        >
          Annuler
        </Button>
        <Tooltip title={isInvalid ? "Veuillez remplir tous les prix" : ""}>
          <span>
            <Button
              variant="contained"
              disabled={loading || isInvalid}
              onClick={onSubmit}
              sx={{ 
                fontWeight: "bold", 
                px: 3,
                fontSize: '0.8rem',
                bgcolor: "#1a237e", // LA COULEUR DE TON IMAGE
                color: "white",
                '&:hover': { bgcolor: '#0d1442' },
                '&.Mui-disabled': { bgcolor: '#cbd5e0', color: '#718096' }
              }}
            >
              {loading ? "ENREGISTREMENT..." : "ENREGISTRER TOUT"}
            </Button>
          </span>
        </Tooltip>
      </Stack>
    </Box>
  );
}