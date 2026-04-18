import * as React from "react";
import { Box, Button, Typography, Stack, Tooltip } from "@mui/material";

export default function ProductBulkSummaryBar({
  products = [],
  loading = false,
  onSubmit,
  onReset,
}) {
  const totalProduits = products.length;
  const isInvalid = products.some(p => !p.prixAchat || !p.prixVente);

  if (totalProduits === 0) return null;

  return (
    <Box sx={{
      p: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between",
      bgcolor: "#f8f9fa", borderBottom: "1px solid #eee",
    }}>
      <Stack>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#1a237e", fontSize: '0.85rem' }}>
          {totalProduits} PRODUIT(S) SÉLECTIONNÉ(S)
        </Typography>
        {isInvalid && (
          <Typography variant="caption" color="error" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
            ⚠️ Remplir les prix d'achat et de vente
          </Typography>
        )}
      </Stack>

      <Stack direction="row" spacing={1.5}>
        <Button variant="text" color="inherit" size="small" onClick={onReset} sx={{ fontSize: '0.75rem', fontWeight: 700 }}>
          Annuler
        </Button>
        <Button
          variant="contained"
          disabled={loading || isInvalid}
          onClick={onSubmit}
          sx={{ 
            fontWeight: "800", px: 4, py: 1, fontSize: '0.85rem', borderRadius: '6px',
            background: 'linear-gradient(180deg, #2c3e50 0%, #000000 100%)',
            color: "white", textTransform: 'uppercase',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            '&:hover': { background: '#000' },
            '&.Mui-disabled': { background: '#ccc', color: '#666' }
          }}
        >
          {loading ? "ENCOURS..." : "ENREGISTRER TOUT"}
        </Button>
      </Stack>
    </Box>
  );
}