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

const LocalPageContainer = ({ children, title }) => (
  <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: '1600px', margin: '0 auto' }}>
    <Box sx={{ mb: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1a237e' }}>{title}</Typography>
    </Box>
    {children}
  </Box>
);

export default function ProductCreateRapide() {
  const notifications = useNotifications();
  const { activePointDeVente } = useUser();

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
    // Utiliser le champ consignable du produit (ajouté à la table groupeliquide)
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
              💰 Total emballage : {emballageTotal} FCFA
            </Typography>
            <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 0.5 }}>
              Calcul : ({prixBouteille || 0} × {nbreBouteillesParCasier || 0}) + {prixCasierPlastique || 0}
            </Typography>
          </Box>
        </Box>
      );
    }
  });

  // Référence pour le focus automatique
  const searchInputRef = React.useRef(null);

  // 1. RECHERCHE CATALOGUE
  React.useEffect(() => {
    if (query.trim().length < 2 || !activePointDeVente?.id) { 
      setResults([]); 
      return; 
    }
    
    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await privateApi.get(`/api/references/recherche`, {
          params: { q: query.toLowerCase(), pdvId: activePointDeVente.id }
        });
        setResults(res.data);
      } catch (err) {
        console.error("Erreur recherche:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query, activePointDeVente?.id]);

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
        stockMinimum: ref.stockMinSuggere || 0,
        nbreBouteillesParCasier: ref.casierBouteilles || 12
      }]);
      setExpandedId(ref.id);
    } else {
      setExpandedId(expandedId === ref.id ? null : ref.id);
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
          designation: `${p.marque} ${p.format}`.trim(),
          marque: p.marque,
          format: p.format,
          groupeLiquide: p.groupeliquideId === 1 ? "BIERE" : p.groupeliquideId === 2 ? "SODA" : "EAU",
          nbreBouteillesParCasier: Number(p.nbreBouteillesParCasier),
          prixAchatHt: Number(p.prixAchat),
          prixVenteHt: Number(p.prixVente),
          consigneBouteille: Number(p.prixBouteille),
          consigneCasier: Number(p.prixCasierPlastique),
          stockInitial: Number(p.stockInitial),
          stockMinimum: Number(p.stockMinimum),
          pointDeVente: { id: activePointDeVente.id },
          reference: { id: p.id }
        };
        await createProduit(payload);
      }

      // Feedback visuel "Brève confirmation"
      setShowToast(true);
      
      // Nettoyage immédiat pour le produit suivant
      setSelected([]); 
      setQuery("");
      setResults([]);
      
      // Remettre le curseur dans la recherche automatiquement
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

          <Box>
            {results.map((ref) => {
              const isSelected = selected.find(s => s.id === ref.id);
              const data = isSelected || {};
              const emballageTotal = isSelected ? (Number(data.prixBouteille) * Number(data.nbreBouteillesParCasier)) + Number(data.prixCasierPlastique) : 0;

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
                        {ref.marque} {ref.format}
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
                      {/* Mobile 3x2 Grid Layout */}
                      <Box sx={{ 
                        display: { xs: 'grid', md: 'none' }, 
                        gridTemplateColumns: '1fr 1fr', 
                        gap: 1.5,
                        mb: 2
                      }}>
                        {/* Ligne 1: Informations tarifaires */}
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

                        {/* Ligne 3: Informations stock */}
                        <Box sx={{ gridColumn: '1 / -1', mb: 1 }}>
                          <Divider sx={{ mb: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#d32f2f' }}>📊 INFORMATIONS STOCK</Typography>
                          </Divider>
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, display: 'block' }}>Stock Initial</Typography>
                              <TextField 
                                fullWidth 
                                size="small" 
                                type="text" 
                                inputMode="decimal" 
                                value={data.stockInitial} 
                                onChange={(e) => updateField(ref.id, "stockInitial", e.target.value)} 
                              />
                            </Box>
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 800, mb: 0.5, display: 'block' }}>Stock Minimum</Typography>
                              <TextField 
                                fullWidth 
                                size="small" 
                                type="text" 
                                inputMode="decimal" 
                                value={data.stockMinimum} 
                                onChange={(e) => updateField(ref.id, "stockMinimum", e.target.value)} 
                              />
                            </Box>
                          </Box>
                        </Box>
                      </Box>

                      {/* Desktop Layout (unchanged) */}
                      <Grid container spacing={{ xs: 1, md: 2 }} sx={{ display: { xs: 'none', md: 'flex' } }}>
                        <Grid item xs={12} md={4}>
                          <Divider sx={{ mb: 1 }}><Typography variant="caption" sx={{ fontWeight: 800 }}>Informations tarifaires </Typography></Divider>
                          <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 1, md: 1 }}>
                            <TextField label="Prix Achat" fullWidth size="small" type="text" inputMode="decimal" value={data.prixAchat} onChange={(e) => updateField(ref.id, "prixAchat", e.target.value)} />
                            <TextField label="Prix Vente" fullWidth size="small" type="text" inputMode="decimal" value={data.prixVente} onChange={(e) => updateField(ref.id, "prixVente", e.target.value)} />
                          </Stack>
                        </Grid>

                        <Grid item xs={12} md={4}>
                          <Divider sx={{ mb: 1 }}><Typography variant="caption" sx={{ fontWeight: 800 }}>STOCK</Typography></Divider>
                          <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 1, md: 1 }}>
                            <TextField label="Initial" fullWidth size="small" type="text" inputMode="decimal" value={data.stockInitial} onChange={(e) => updateField(ref.id, "stockInitial", e.target.value)} />
                            <TextField label="Alerte" fullWidth size="small" type="text" inputMode="decimal" value={data.stockMinimum} onChange={(e) => updateField(ref.id, "stockMinimum", e.target.value)} />
                          </Stack>
                          {/* Nb bouteilles affiché dans le titre seulement (lecture seule) */}
                        </Grid>
                      </Grid>

                      {/* Consignes par type - affiché dans les deux layouts (mobile et desktop) */}
                      {consigneSections[data.groupeliquideId]}

                    </Box>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        </Box>
      </Card>

      {/* TOAST DE CONFIRMATION (NON-INTRUSIF) */}
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
