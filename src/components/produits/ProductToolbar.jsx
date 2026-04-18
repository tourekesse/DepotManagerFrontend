import React from "react";
import { Box, TextField, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

export default function ProductToolbar({ onSearch, onCreate }) {
  return (
    <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
      <TextField
        placeholder="Rechercher un produit..."
        onChange={(e) => onSearch(e.target.value)}
        fullWidth
      />

      <Button
        variant="contained"
        color="success"
        startIcon={<AddIcon />}
        onClick={onCreate}
      >
        Nouveau
      </Button>
    </Box>
  );
}
