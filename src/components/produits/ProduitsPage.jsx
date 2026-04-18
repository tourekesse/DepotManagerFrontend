import React, { useState, useContext } from "react";
import { SelectButton } from "primereact/selectbutton";

import {
  Box,
  Typography,
  Divider,
} from "@mui/material";

import UserContext from "../../../context/UserContext";
import ProductTable from "../../../components/ProductTable";

import AjoutRapide from "./AjoutRapide";
import ModeClassique from "./ModeClassique";

export default function ProduitsPage() {
  const { user } = useContext(UserContext);
  const [mode, setMode] = useState("classique");
  const [produits, setProduits] = useState([]);

  if (!user) return null;

  const handleProductAdded = (produit) => {
    setProduits((prev) => [...prev, produit]);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* ✅ Sélecteur de mode */}
      <SelectButton
        value={mode}
        options={[
          { label: "AJOUT RAPIDE", value: "rapide" },
          { label: "AJOUT CLASSIQUE", value: "classique" },
        ]}
        onChange={(e) => setMode(e.value)}
        className="mb-4"
      />

      {/* ✅ Mode Ajout Rapide */}
      {mode === "rapide" && (
        <AjoutRapide onProductAdded={handleProductAdded} />
      )}

      {/* ✅ Mode Ajout Classique */}
      {mode === "classique" && (
        <ModeClassique onProductAdded={handleProductAdded} />
      )}

      {/* ✅ Liste des produits saisis */}
      {produits.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography
            variant="caption"
            fontWeight="bold"
            color="text.secondary"
          >
            Liste des produits saisis
          </Typography>

          <Divider sx={{ my: 2, opacity: 0.3 }} />

          <ProductTable produits={produits} />
        </Box>
      )}
    </Box>
  );
}
