import * as React from "react";
import {
  Box, Card, Typography, TextField, Checkbox, Grid,
  Accordion, AccordionSummary, AccordionDetails, Stack,
  CircularProgress, Divider, Snackbar, Alert
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// Tes imports personnalisés
import { privateApi } from "../../../api/axios";
import { createProduit } from "../../../api/produitsApi";
import { useUser } from "../../../context/UserContext";
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";
import ProductBulkSummaryBar from "../../../components/ProductBulkSummaryBar";
import { getActivePointDeVenteId } from "../../../utils/pdv";
import { formatCurrency } from "../../../utils/currencyUtils";

const LocalPageContainer = ({ children, title }) => (
    <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: '1600px', margin: '0 auto' }}>
      <Box sx={{ mb: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1a237e' }}>{title}</Typography>
      </Box>
      {children}
    </Box>
);

/**
 * Helper function to get activePointDeVente from context or localStorage
 */
const getActivePV = (contextPV) => {
  if (contextPV?.id) return contextPV;

  // Fallback to localStorage for CLIENT_BAR users
  try {
    const activePVRaw = localStorage.getItem("activePV");
    if (activePVRaw) {
      return JSON.parse(activePVRaw);
    }
  } catch (_) {}

  // Fallback: dériver depuis dmUser
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

const getUniteLibelle = (product) => {
  const libelle = product?.uniteVenteParDefaut?.libelle || product?.uniteVenteParDefautLibelle;
  if (libelle) return libelle;
  if (Number(product?.uniteVenteParDefautId) === 1) return "Casier";
  if (Number(product?.uniteVenteParDefautId) === 2) return "Bouteille";
  if (Number(product?.uniteVenteParDefautId) === 3) return "Canette";
  return "Casier";
};

const buildDesignationRapide = (product) => {
  const base = `${product?.marque || ""} ${product?.format || ""}`.trim();
  const unite = getUniteLibelle(product);
  return `${unite} ${base}`.trim();
};

export default function ProductCreateRapide() {
  const notifications = useNotifications();
  const { activePointDeVente, user, sessionId, getDisplayName } = useUser();

  // Get activePV from context or localStorage fallback
  const activePV = getActivePV(activePointDeVente);

  // États
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState([]);
  const [selected, setSelected] = React.useState([]);
  const [expandedId, setExpandedId] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showToast, setShowToast] = React.useState(false);

  // Grouper les produits sélectionnés par groupeliquideId
  const groupedProducts = selected.reduce((acc, product) => {
    const groupId = product.groupeliquideId;
    if (!acc[groupId]) acc[groupId] = [];
    acc[groupId].push(product);
    return acc;
  }, {});

  // Fonction pour obtenir le nom du groupe
  const getGroupName = (groupId) => {
    const id = Number(groupId);
    if (id === 11) return 'BIERE';
    if (id === 13) return 'SODA';
    if (id === 16) return 'MALTA';
    return 'EAU'; // ou autre
  };

  // Préparer les sections consignes par groupe
  const consigneSections = {};
  Object.entries(groupedProducts).forEach(([groupId, productsInGroup]) => {
    const groupeIdNum = Number(groupId);
    const avecConsignes = productsInGroup[0]?.consignable === true || productsInGroup[0]?.consignable === 1;
    const groupName = getGroupName(groupId);
    const prixBouteille = productsInGroup[0]?.prixBouteille || 0;
    const prixCasierPlastique = productsInGroup[0]?.prixCasierPlastique || 0;
    const nbreBouteillesParCasier = productsInGroup[0]?.nbreBouteillesParCasier || 12;
    const emballageTotal = (prixBouteille * nbreBouteillesParCasier) + prixCasierPlastique;

    if (!avecConsignes) {
      consigneSections[groupId] = (
          <Box sx={{ gridColumn: '1 / -1', mb: 1 }}>
            <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2, border: '1px solid #e0e0e0' }}>
              <Typography variant="body2" sx={{ color: '#757575' }}>
                ℹ️ Ce type de produit n'a pas de consignes (emballage perdu)
              </Typography>
            </Box>
          </Box>
      );
    } else {
      consigneSections[groupId] = (
          <Box sx={{ gridColumn: '1 / -1', mb: 1 }}>
            <Divider sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#2e7d32' }}>
                📦 INFORMATIONS CONSIGNES - Groupe {groupName}
              </Typography>
            </Divider>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, display: 'block' }}>
                  Consigne Bouteille
                </Typography>
                <TextField
                    fullWidth
                    size="small"
                    type="text"
                    inputMode="decimal"
                    value={prixBouteille}
                    onChange={(e) => updateConsigneForGroup(groupId, 'prixBouteille', e.target.value)}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, display: 'block' }}>
                  Consigne Casier
                </Typography>
                <TextField
                    fullWidth
                    size="small"
                    type="text"
                    inputMode="decimal"
                    value={prixCasierPlastique}
                    onChange={(e) => updateConsigneForGroup(groupId, 'prixCasierPlastique', e.target.value)}
                />
              </Box>
            </Box>
            <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#e3f2fd', borderRadius: 2, border: '1px solid #90caf9' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#1565c0' }}>
                💰 Total emballage : {formatCurrency(emballageTotal)}
              </Typography>
              <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 0.5 }}>
                Calcul : ({prixBouteille || 0} × {nbreBouteillesParCasier || 0}) + {prixCasierPlastique || 0}
              </Typography>
            </Box>
          </Box>
      );
    }
  });

  const searchInputRef = React.useRef(null);

  // 1. RECHERCHE CATALOGUE
  React.useEffect(() => {
    if (query.trim().length < 2 || !activePV?.id) {
      setResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await privateApi.get(`/api/references/recherche`, {
          params: { q: query.toLowerCase(), pdvId: activePV.id }
        });
        setResults(res.data);
      } catch (err) {
        console.error("Erreur recherche:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query, activePV?.id]);

  // 2. SÉLECTION ET PRÉ-REMPLISSAGE
  const handleAccordionToggle = (ref) => {
    const isAlreadySelected = selected.find(s => s.id === ref.id);
    if (!isAlreadySelected) {
      setSelected(prev => [...prev, {
        ...ref,
        prixAchat: ref.prixAchatMoyen || 0,
        prixVente: 0,
        prixBouteille: 0,
        prixCasierPlastique: 0,
        stockInitial: 0,
        stockVideInitial: 0,
        stockMinimum: ref.stockMinSuggere || 0,
          nbreBouteillesParCasier: ref.casierBouteilles || 12,
        uniteVenteParDefautId: ref.uniteVenteParDefaut?.id || ref.uniteVenteParDefautId || 1,
        uniteVenteParDefautLibelle: ref.uniteVenteParDefaut?.libelle || ref.uniteVenteParDefautLibelle || "Casier"
      }]);
      setExpandedId(ref.id);
    } else {
      setSelected(prev => prev.filter(s => s.id !== ref.id));
      setExpandedId(null);
    }
  };



  const updateField = (id, field, value) => {
    setSelected(prev => prev.map(p => p.id === id ? { ...p, [field]: value === "" ? "" : Number(value) } : p));
  };

  const updateConsigneForGroup = (groupId, field, value) => {
    setSelected(prev => prev.map(p => String(p.groupeliquideId) === String(groupId) ? { ...p, [field]: value === "" ? "" : Number(value) } : p));
  };

  // 3. ENREGISTREMENT FLUIDE
  const handleAjouterProduits = async () => {
    setLoading(true);
    try {
      for (const p of selected) {
        const payload = {
          designation: buildDesignationRapide(p),
          marque: p.marque,
          format: p.format,
          groupeLiquide: p.groupeliquideId === 11 ? "BIERE" : p.groupeliquideId === 13 ? "SODA" : p.groupeliquideId === 16 ? "MALTA" : "EAU",
          nbreBouteillesParCasier: Number(p.nbreBouteillesParCasier),
          prixAchatHt: Number(p.prixAchat),
          prixVenteHt: Number(p.prixVente),
          consigneBouteille: Number(p.prixBouteille),
          consigneCasier: Number(p.prixCasierPlastique),
          stockInitial: Number(p.stockInitial),
          stockVideInitial: Number(p.stockVideInitial || 0), // Transmis proprement au backend
          stockMinimum: Number(p.stockMinimum),
          uniteVenteParDefautId: Number(p.uniteVenteParDefautId || 1),
          pointDeVente: { id: activePV.id },
          referenceId: p.id
        };
        await createProduit(payload);
      }

      setShowToast(true);
      setSelected([]);
      setQuery("");
      setResults([]);
      setTimeout(() => searchInputRef.current?.focus(), 100);

    } catch (error) {
      notifications.show("Erreur lors de l'enregistrement", { severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
      <LocalPageContainer title="Catalogue Rapide">
        <Card sx={{ borderRadius: 2, border: '1px solid #e0e0e0', boxShadow: 'none' }}>
          <ProductBulkSummaryBar
              products={selected}
              loading={loading}
              onSubmit={handleAjouterProduits}
              onReset={() => { setSelected([]); setQuery(""); }}
          />

          <Box sx={{ p: { xs: 1, md: 2 } }}>
            <TextField
                inputRef={searchInputRef}
                placeholder="Rechercher une boisson (ex: CASTEL, GUINNESS...)"
                fullWidth size="small"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ mb: 1 }}
                InputProps={{
                  endAdornment: isSearching && <CircularProgress size={20} />,
                  sx: { borderRadius: '8px', bgcolor: '#fcfcfc' }
                }}
            />

            {!activePV && (
                <Box sx={{ p: 2, mb: 2, bgcolor: '#fff3e0', borderRadius: 2, border: '1px solid #ffcc80' }}>
                  <Typography variant="body2" sx={{ color: '#e65100', fontWeight: 600 }}>
                    ⚠️ Point de vente non disponible
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#e65100' }}>
                    Impossible de rechercher des produits sans point de vente sélectionné.
                  </Typography>
                </Box>
            )}

            <Box>
              {results.map((ref) => {
                const isSelected = selected.find(s => s.id === ref.id);
                const data = isSelected || {};

                return (
                    <Accordion
                        key={ref.id}
                        expanded={expandedId === ref.id}
                        onChange={() => handleAccordionToggle(ref)}
                        sx={{
                          mb: 0.5,
                          boxShadow: 'none',
                          border: isSelected ? '2px solid #1a237e' : '1px solid #eee',
                          borderRadius: '8px !important',
                          '&:before': { display: 'none' }
                        }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Checkbox checked={!!isSelected} size="small" color="primary" />
                          <Typography sx={{ fontWeight: 700, display: 'flex', gap: 0.5, alignItems: 'center' }}>
                            {buildDesignationRapide(isSelected || ref)}
                            {ref.casierBouteilles ? (
                                <Box component="span" sx={{ color: '#1a237e', fontWeight: 800 }}>
                                  ({ref.casierBouteilles} bouteilles)
                                </Box>
                            ) : null}
                          </Typography>
                        </Stack>
                      </AccordionSummary>

                      <AccordionDetails sx={{ bgcolor: '#f8f9fa', p: { xs: 1, md: 2 }, borderTop: '1px solid #eee' }}>
                        <Box onClick={(e) => e.stopPropagation()}>

                          {/* ================= LAYOUT MOBILE (xs) ================= */}
                          <Box sx={{
                            display: { xs: 'grid', md: 'none' },
                            gridTemplateColumns: '1fr 1fr',
                            gap: 1.5,
                            mb: 2
                          }}>
                            <Box sx={{ gridColumn: '1 / -1', mb: 1 }}>
                              <Divider sx={{ mb: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: '#1a237e' }}>💰 INFORMATIONS TARIFAIRES</Typography>
                              </Divider>
                              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                                <Box>
                                  <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, display: 'block' }}>Prix Achat</Typography>
                                  <TextField
                                      fullWidth
                                      size="small"
                                      type="text"
                                      inputMode="decimal"
                                      value={data.prixAchat}
                                      onChange={(e) => updateField(ref.id, "prixAchat", e.target.value)}
                                  />
                                </Box>
                                <Box>
                                  <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, display: 'block' }}>Prix Vente</Typography>
                                  <TextField
                                      fullWidth
                                      size="small"
                                      type="text"
                                      inputMode="decimal"
                                      value={data.prixVente}
                                      onChange={(e) => updateField(ref.id, "prixVente", e.target.value)}
                                  />
                                </Box>
                              </Box>
                            </Box>

                            <Box sx={{ gridColumn: '1 / -1', mb: 1 }}>
                              <Divider sx={{ mb: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: '#d32f2f' }}>📊 INFORMATIONS STOCK</Typography>
                              </Divider>
                              {/* Grille modifiée pour passer à 3 colonnes sur Mobile */}
                              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
                                <Box>
                                  <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, display: 'block' }}>Initial</Typography>
                                  <TextField
                                      fullWidth
                                      size="small"
                                      type="text"
                                      inputMode="decimal"
                                      value={data.stockInitial || 0}
                                      onChange={(e) => updateField(ref.id, "stockInitial", e.target.value)}
                                  />
                                </Box>
                                <Box>
                                  <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, display: 'block' }}>Vide Init.</Typography>
                                  <TextField
                                      fullWidth
                                      size="small"
                                      type="text"
                                      inputMode="decimal"
                                      value={data.stockVideInitial || 0}
                                      onChange={(e) => updateField(ref.id, "stockVideInitial", e.target.value)}
                                  />
                                </Box>
                                <Box>
                                  <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, display: 'block' }}>Alerte</Typography>
                                  <TextField
                                      fullWidth
                                      size="small"
                                      type="text"
                                      inputMode="decimal"
                                      value={data.stockMinimum || 0}
                                      onChange={(e) => updateField(ref.id, "stockMinimum", e.target.value)}
                                  />
                                </Box>
                              </Box>
                            </Box>
                          </Box>

                          {/* ================= LAYOUT DESKTOP (md) ================= */}
                          <Grid container spacing={{ xs: 1, md: 2 }} sx={{ display: { xs: 'none', md: 'flex' }, mb: 2 }}>
                            <Grid item xs={12} md={5}>
                              <Divider sx={{ mb: 1 }}><Typography variant="caption" sx={{ fontWeight: 800 }}>Informations tarifaires </Typography></Divider>
                              <Stack direction="row" spacing={1}>
                                <TextField label="Prix Achat" fullWidth size="small" type="text" inputMode="decimal" value={data.prixAchat} onChange={(e) => updateField(ref.id, "prixAchat", e.target.value)} />
                                <TextField label="Prix Vente" fullWidth size="small" type="text" inputMode="decimal" value={data.prixVente} onChange={(e) => updateField(ref.id, "prixVente", e.target.value)} />
                              </Stack>
                            </Grid>

                            <Grid item xs={12} md={7}>
                              <Divider sx={{ mb: 1 }}><Typography variant="caption" sx={{ fontWeight: 800 }}>STOCK</Typography></Divider>
                              {/* Aligné sur 3 colonnes pour accueillir le stock vide */}
                              <Stack direction="row" spacing={1}>
                                <TextField label="Initial (Pleins)" fullWidth size="small" type="text" inputMode="decimal" value={data.stockInitial || 0} onChange={(e) => updateField(ref.id, "stockInitial", e.target.value)} />
                                <TextField label="Stock Vide Initial" fullWidth size="small" type="text" inputMode="decimal" value={data.stockVideInitial || 0} onChange={(e) => updateField(ref.id, "stockVideInitial", e.target.value)} />
                                <TextField label="Alerte" fullWidth size="small" type="text" inputMode="decimal" value={data.stockMinimum || 0} onChange={(e) => updateField(ref.id, "stockMinimum", e.target.value)} />
                              </Stack>
                            </Grid>
                          </Grid>

                          {consigneSections[data.groupeliquideId]}

                        </Box>
                      </AccordionDetails>
                    </Accordion>
                );
              })}
            </Box>
          </Box>
        </Card>

        <Snackbar
            open={showToast}
            autoHideDuration={2500}
            onClose={() => setShowToast(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="success" variant="filled" sx={{ width: '100%', bgcolor: '#1a237e', borderRadius: '12px' }}>
            Produit(s) enregistré(s) ! ✓
          </Alert>
        </Snackbar>
      </LocalPageContainer>
  );
}
