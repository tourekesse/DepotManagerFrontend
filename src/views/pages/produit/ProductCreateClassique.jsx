import * as React from "react";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../../crud-dashboard/components/PageContainer";
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";
import { createProduit } from "../../../api/produitsApi";
import ProductForm from "./form/ProductForm";
import { detectProductInfo } from "../../../views/pages/setup/services/detectProductInfo";
import { Chip, Box, Typography } from "@mui/material";

// mêmes valeurs que le backend
const INITIAL_VALUES = {
  designation: "",
  marque: "",
  format: "",
  groupeLiquide: "",
  nbreBouteillesParCasier: 0,
  prixAchatHt: 0,
  prixVenteHt: 0,
  consigneBouteille: 0,
  consigneCasier: 0,
  coutCasierNeuf: 0,
  stockInitial: 0,
  stockMinimum: 0,
};

export default function ProductCreateClassique() {
  const navigate = useNavigate();
  const notifications = useNotifications();

  const [values, setValues] = React.useState(INITIAL_VALUES);
  const [errors, setErrors] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [autoInfo, setAutoInfo] = React.useState(null);

  // 🎯 AUTO-DÉTECTION INTELLIGENTE
  React.useEffect(() => {
    if (values.designation.trim().length >= 3) {
      const info = detectProductInfo(values.designation.trim());
      setAutoInfo(info || null);
      
      // 🔄 PRÉ-REMPLISSAGE AUTOMATIQUE
      if (info) {
        setValues(prev => ({
          ...prev,
          marque: prev.marque || info.marque || "",
          format: prev.format || info.format || "",
          groupeLiquide: prev.groupeLiquide || info.groupe || "",
          nbreBouteillesParCasier: prev.nbreBouteillesParCasier || info.casierBouteilles || 0,
        }));
      }
    } else {
      setAutoInfo(null);
    }
  }, [values.designation]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    const required = [
      "designation",
      "groupeLiquide",
      "prixVenteHt",
      "stockInitial",
      "nbreBouteillesParCasier",
    ];

    const newErrors = {};
    required.forEach((field) => {
      if (!values[field] || (typeof values[field] === "string" && values[field].trim() === "")) {
        newErrors[field] = "Ce champ est requis";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        ...values,
        pointDeVenteId: 1, // À adapter avec le point de vente actif
      };
      await createProduit(payload);
      notifications.show("Produit créé avec succès", { severity: "success" });
      navigate("/accueil/produits");
    } catch (error) {
      notifications.show("Erreur lors de la création", { severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Ajout Classique"
      breadcrumbs={[
        { title: "Produits", path: "/accueil/produits" },
        { title: "Nouveau" },
      ]}
    >
      {/* 🎯 INDICATEUR D'AUTO-DÉTECTION AMÉLIORÉ */}
      {autoInfo && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: 2,
            backgroundColor: "#e3f2fd",
            border: "1px solid #90caf9",
            borderRadius: 2,
          }}>
            <Chip 
              label="🤖 Auto-détecté" 
              color="primary" 
              size="small" 
              variant="filled"
            />
            <Typography variant="body2" sx={{ fontWeight: 600, color: "#1565c0" }}>
              {autoInfo.marque} - {autoInfo.format}
              {autoInfo.casierBouteilles && (
                <Typography component="span" sx={{ ml: 1, fontSize: "12px", color: "#666" }}>
                  ({autoInfo.casierBouteilles} bouteilles/casier)
                </Typography>
              )}
            </Typography>
          </Box>
        </Box>
      )}

      {/* 🎯 INDICATEURS D'ÉTAT */}
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <Chip 
          label="📝 Mode Manuel" 
          color="secondary" 
          size="small" 
          variant="outlined"
        />
        <Chip 
          label="🔄 Flexible Total" 
          color="success" 
          size="small" 
          variant="outlined"
        />
        {values.designation.length >= 3 && (
          <Chip 
            label={autoInfo ? "✅ Détection active" : "🔍 Analyse..."} 
            color={autoInfo ? "success" : "warning"} 
            size="small" 
            variant="filled"
          />
        )}
      </Box>

      <ProductForm
        values={values}
        errors={errors}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/accueil/produits")}
        submitLabel="Enregistrer le produit"
        loading={loading}
      />
    </PageContainer>
  );
}
