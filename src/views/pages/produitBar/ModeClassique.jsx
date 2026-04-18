import React, { useState, useEffect, useRef } from "react";
import { Toast } from "primereact/toast";
import { Button as PButton } from "primereact/button";

import {
  Card,
  TextField,
  Grid,
  Typography,
} from "@mui/material";

import { detectProductInfo } from "../../../service/detectProductInfo";
import { safeProductFields } from "../../../utils/productGuards";
import { privateApi } from "../../../api/axios";
import { getActivePointDeVenteId } from "../../../utils/pdv";

export default function ModeClassique({ onProductAdded }) {
  const toast = useRef(null);

  const [loading, setLoading] = useState(false);
  const [designation, setDesignation] = useState("");
  const [autoInfo, setAutoInfo] = useState(null);

  const [form, setForm] = useState({
    prixAchatHt: "",
    prixVenteHt: "",
    consigneBouteille: "",
    consigneCasier: "",
    coutCasierNeuf: "",
    stockInitial: 0,
    stockMinimum: 0,
  });

  /* ✅ Détection automatique */
  useEffect(() => {
    if (designation.trim().length >= 3) {
      const info = detectProductInfo(designation.trim());
      setAutoInfo(info || null);
    } else {
      setAutoInfo(null);
    }
  }, [designation]);

  /* ✅ Enregistrement classique */
  const handleSubmit = async () => {
    const pvId = getActivePointDeVenteId();
    if (!pvId) {
      toast.current.show({
        severity: "error",
        summary: "Point de vente requis",
        detail: "Sélectionnez un point de vente avant d'ajouter un produit.",
        life: 4000,
      });
      return;
    }

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
      ...form,
      pointDeVenteId: pvId,
    };

    setLoading(true);
    try {
      await privateApi.post("/api/produits", payload);

      toast.current.show({
        severity: "success",
        summary: "Produit enregistré",
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

      <TextField
        label="Désignation du produit *"
        fullWidth
        value={designation}
        onChange={(e) => setDesignation(e.target.value)}
        sx={{ mb: 3 }}
      />

      {autoInfo && (
        <Typography variant="body2" sx={{ mb: 2 }}>
          <strong>{autoInfo.marque}</strong> – {autoInfo.format}
          <br />
          {autoInfo.casierBouteilles} bouteilles / casier
        </Typography>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            type="number"
            label="Prix achat HT *"
            fullWidth
            value={form.prixAchatHt}
            onChange={(e) =>
              setForm((f) => ({ ...f, prixAchatHt: e.target.value }))
            }
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            type="number"
            label="Prix vente HT"
            fullWidth
            value={form.prixVenteHt}
            onChange={(e) =>
              setForm((f) => ({ ...f, prixVenteHt: e.target.value }))
            }
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            type="number"
            label="Bouteille vide"
            fullWidth
            value={form.consigneBouteille}
            onChange={(e) =>
              setForm((f) => ({ ...f, consigneBouteille: e.target.value }))
            }
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            type="number"
            label="Casier complet"
            fullWidth
            value={form.consigneCasier}
            onChange={(e) =>
              setForm((f) => ({ ...f, consigneCasier: e.target.value }))
            }
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField
            type="number"
            label="Casier neuf"
            fullWidth
            value={form.coutCasierNeuf}
            onChange={(e) =>
              setForm((f) => ({ ...f, coutCasierNeuf: e.target.value }))
            }
          />
        </Grid>
      </Grid>

      <PButton
        label="ENREGISTRER LE PRODUIT"
        className="p-button-success w-full mt-4"
        loading={loading}
        onClick={handleSubmit}
      />
    </Card>
  );
}
