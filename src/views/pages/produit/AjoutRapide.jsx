import React, { useState, useRef } from "react";
import { Toast } from "primereact/toast";
import { Button as PButton } from "primereact/button";

import {
  Card,
  TextField,
  Typography,
  Box,
} from "@mui/material";

import { privateApi } from "../../../api/axios";
import { detectProductInfo } from "../../../service/detectProductInfo";
import { safeProductFields } from "../../../utils/productGuards";

export default function AjoutRapide({ onProductAdded }) {
  const toast = useRef(null);

  const [designation, setDesignation] = useState("");
  const [autoInfo, setAutoInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  /* ✅ Détection automatique */
  const handleDesignationChange = (value) => {
    setDesignation(value);

    if (value.trim().length >= 3) {
      const info = detectProductInfo(value.trim());
      setAutoInfo(info || null);
    } else {
      setAutoInfo(null);
    }
  };

  /* ✅ Enregistrement rapide */
  const handleSubmit = async () => {
    if (!autoInfo) {
      toast.current.show({
        severity: "warn",
        summary: "Information insuffisante",
        detail: "Impossible de détecter les informations du produit",
        life: 3000,
      });
      return;
    }

    const safe = safeProductFields({
      marque: autoInfo.marque,
      format: autoInfo.format,
      groupeLiquide: autoInfo.groupe,
    });

    const payload = {
      designation: designation.trim(),
      ...safe,
      nbreBouteillesParCasier: autoInfo.casierBouteilles,

      // ✅ Ajout rapide = valeurs par défaut
      prixAchatHt: 0,
      prixVenteHt: 0,
      consigneBouteille: 0,
      consigneCasier: 0,
      coutCasierNeuf: 0,
      stockInitial: 0,
      stockMinimum: 0,
    };

    setLoading(true);
    try {
      await privateApi.post("/api/produits", payload);

      toast.current.show({
        severity: "success",
        summary: "Produit ajouté",
        detail: "Ajout rapide effectué",
        life: 3000,
      });

      onProductAdded?.(payload);

      setDesignation("");
      setAutoInfo(null);
    } catch (e) {
      toast.current.show({
        severity: "error",
        summary: "Erreur",
        detail: e.response?.data?.message || "Erreur serveur",
        life: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ p: 2 }}>
      <Toast ref={toast} />

      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
        Ajout rapide d’un produit
      </Typography>

      <TextField
        label="Désignation du produit *"
        fullWidth
        value={designation}
        onChange={(e) => handleDesignationChange(e.target.value)}
        sx={{ mb: 3 }}
      />

      {autoInfo && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>{autoInfo.marque}</strong> – {autoInfo.format}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {autoInfo.casierBouteilles} bouteilles / casier
          </Typography>
        </Box>
      )}

      <PButton
        label="AJOUTER"
        className="p-button-success w-full"
        loading={loading}
        onClick={handleSubmit}
      />
    </Card>
  );
}
