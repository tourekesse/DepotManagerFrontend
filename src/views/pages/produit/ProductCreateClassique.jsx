import * as React from "react";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../../crud-dashboard/components/PageContainer";
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";
import { createProduit } from "../../../api/produitsApi";
import { createReferentielProduit, fetchFormatsReferences, fetchMarquesReferences, fetchReferentielsProduits } from "../../../api/referentielsProduitsApi";
import { fetchUnites } from "../../../api/unitesApi";
import ProductForm from "./form/ProductForm";
import { detectProductInfo } from "../../../views/pages/setup/services/detectProductInfo";
import { Chip, Box } from "@mui/material";
import { useUser } from "../../../context/UserContext"; // ✨ Import du contexte utilisateur

// mêmes valeurs que le backend
const INITIAL_VALUES = {
  designation: "",
  marque: "",
  variante: "",
  format: "",
  groupeLiquide: "",
  nbreBouteillesParCasier: 0,
  prixAchatHt: 0,
  prixVenteHt: 0,
  consigneBouteille: 0,
  consigneCasier: 0,
  coutCasierNeuf: 0,
  stockInitial: 0,
  stockVideInitial: 0,
  stockMinimum: 0,
  uniteVenteParDefautId: "",
};

/**
 * Helper function pour récupérer le point de vente actif (sécurité)
 */
const getActivePV = (contextPV) => {
  if (contextPV?.id) return contextPV;
  try {
    const activePVRaw = localStorage.getItem("activePV");
    if (activePVRaw) {
      return JSON.parse(activePVRaw);
    }
  } catch (_) {}
  try {
    const dmUserRaw = localStorage.getItem("dmUser");
    if (dmUserRaw) {
      const dmUser = JSON.parse(dmUserRaw);
      const pvs = dmUser.pointsDeVente || dmUser.points_de_vente;
      const id = dmUser.defaultPointDeVenteId || dmUser.default_point_de_vente_id
             || dmUser.pointDeVenteActifId || dmUser.point_de_vente_actif_id;
      if (id && pvs) {
        const found = pvs.find(pv => pv.id === id);
        if (found) return found;
      }
      if (pvs && pvs.length > 0) return pvs[0];
    }
  } catch (_) {}
  return null;
};

const buildFinalDesignation = (values, unites) => {
  const marque = (values.marque || "").trim();
  const variante = (values.variante || "").trim();
  const format = (values.format || "").trim();
  const unite = unites.find((item) => String(item.id) === String(values.uniteVenteParDefautId))?.libelle || "";
  return [unite, marque, variante, format].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
};

const normalizeText = (value = "") => value
  .toString()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "");

const mergeMarques = (localMarques = [], catalogMarques = []) => {
  const byKey = new Map();
  catalogMarques.forEach((libelle) => {
    if (!libelle) return;
    byKey.set(normalizeText(libelle), { libelle, source: "CATALOGUE" });
  });
  localMarques.forEach((marque) => {
    if (!marque?.libelle) return;
    const key = normalizeText(marque.libelle);
    byKey.set(key, { ...marque, source: byKey.has(key) ? "CATALOGUE" : "LOCAL" });
  });
  return Array.from(byKey.values()).sort((a, b) => a.libelle.localeCompare(b.libelle));
};

const mergeFormats = (localFormats = [], catalogFormats = []) => {
  const byKey = new Map();
  catalogFormats.forEach((libelle) => {
    if (!libelle) return;
    byKey.set(normalizeText(libelle), { libelle, source: "CATALOGUE" });
  });
  localFormats.forEach((format) => {
    if (!format?.libelle) return;
    const key = normalizeText(format.libelle);
    byKey.set(key, { ...format, source: byKey.has(key) ? "CATALOGUE" : "LOCAL" });
  });
  return Array.from(byKey.values()).sort((a, b) => a.libelle.localeCompare(b.libelle));
};

export default function ProductCreateClassique() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const { activePointDeVente } = useUser(); // ✨ Récupération du point de vente actif

  const [values, setValues] = React.useState(INITIAL_VALUES);
  const [errors, setErrors] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [autoInfo, setAutoInfo] = React.useState(null);
  const [referentiels, setReferentiels] = React.useState({ marques: [], formats: [], groupesLiquides: [] });
  const [unites, setUnites] = React.useState([]);

  // 🎯 AUTO-DÉTECTION INTELLIGENTE
  React.useEffect(() => {
    const source = buildFinalDesignation(values, unites);
    if (source.trim().length >= 3) {
      const info = detectProductInfo(source.trim());
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
  }, [values.marque, values.variante, values.format, values.uniteVenteParDefautId, unites]);

  React.useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchReferentielsProduits(),
      fetchUnites(),
      fetchMarquesReferences().catch(() => []),
      fetchFormatsReferences().catch(() => []),
    ])
      .then(([data, unitesData, marquesReferences, formatsReferences]) => {
        if (mounted) {
          setReferentiels({
            marques: mergeMarques(data.marques || [], marquesReferences || []),
            formats: mergeFormats(data.formats || [], formatsReferences || []),
            groupesLiquides: data.groupesLiquides || [],
          });
          setUnites(unitesData || []);
          const bouteille = (unitesData || []).find((unite) => unite.libelle?.toLowerCase() === "bouteille");
          if (bouteille) {
            setValues((prev) => ({ ...prev, uniteVenteParDefautId: prev.uniteVenteParDefautId || bouteille.id }));
          }
        }
      })
      .catch(() => notifications.show("Impossible de charger les référentiels produits", { severity: "warning" }));
    return () => {
      mounted = false;
    };
  }, [notifications]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const rememberLocalMarque = (libelle) => {
    const cleaned = (libelle || "").trim();
    if (!cleaned) return;
    setReferentiels((prev) => {
      const exists = (prev.marques || []).some((marque) => normalizeText(marque.libelle) === normalizeText(cleaned));
      if (exists) return prev;
      return {
        ...prev,
        marques: [...(prev.marques || []), { libelle: cleaned, source: "LOCAL" }]
          .sort((a, b) => a.libelle.localeCompare(b.libelle)),
      };
    });
  };

  const rememberLocalFormat = (libelle) => {
    const cleaned = (libelle || "").trim();
    if (!cleaned) return;
    setReferentiels((prev) => {
      const exists = (prev.formats || []).some((format) => normalizeText(format.libelle) === normalizeText(cleaned));
      if (exists) return prev;
      return {
        ...prev,
        formats: [...(prev.formats || []), { libelle: cleaned, source: "LOCAL" }]
          .sort((a, b) => a.libelle.localeCompare(b.libelle)),
      };
    });
  };

  const handleCreateReferentiel = async (type, libelle) => {
    const item = await createReferentielProduit(type, libelle);
    const keyByType = {
      marque: "marques",
      format: "formats",
      groupeLiquide: "groupesLiquides",
    };
    const key = keyByType[type];
    setReferentiels((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []).filter((existing) => existing.id !== item.id), { ...item, source: type === "marque" ? "LOCAL" : undefined }]
        .sort((a, b) => a.libelle.localeCompare(b.libelle)),
    }));
    setValues((prev) => ({ ...prev, [type]: item.libelle }));
    setErrors((prev) => ({ ...prev, [type]: null }));
    return item;
  };

  const validate = () => {
    const required = [
      "marque",
      "format",
      "groupeLiquide",
      "prixVenteHt",
      "stockInitial",
      "nbreBouteillesParCasier",
      "uniteVenteParDefautId",
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

    const pvActif = getActivePV(activePointDeVente);
    if (!pvActif) {
      notifications.show("Erreur : Aucun point de vente actif détecté", { severity: "error" });
      return;
    }

    setLoading(true);
    try {
      rememberLocalMarque(values.marque);
      rememberLocalFormat(values.format);
      const payload = {
        ...values,
        designation: buildFinalDesignation(values, unites),
        pointDeVenteId: pvActif.id, // ✨ Utilise le vrai ID du point de vente connecté !
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
          previewDesignation={buildFinalDesignation(values, unites)}
          referentiels={referentiels}
            unites={unites}
            onCreateReferentiel={handleCreateReferentiel}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/accueil/produits")}
            submitLabel="Enregistrer le produit"
            loading={loading}
        />
      </PageContainer>
  );
}
