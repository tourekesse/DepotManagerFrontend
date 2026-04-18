// LivraisonSimple.jsx — Wizard option 3 (sans stepper) pour le cas "compensation"
// - Écran 1: Livraison (switch + 2 boutons) inchangé
// - Écran 2: Dialog Wizard (3 étapes internes) : 1) Non rendus  2) Règlement  3) Confirmation
//
// Important:
// 1) Tu gardes TES calculs (articles/consigneTotale etc.). Ici je reprends ton code et je le réorganise.
// 2) Le bandeau du wizard affiche "Valeur des emballages livrés" = totalConsigne (6600...).
// 3) La progression "réglé" est basée sur totalManquants (non rendus). Si non rendus = 0, on affiche un message.
//
// Dépendances: MUI + tes helpers privateApi/getActivePointDeVenteId

import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  Typography,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Paper,
  Divider,
  FormControlLabel,
  Switch,
  Alert,
  Tooltip,
  LinearProgress,
  Snackbar,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Delete, Add, CheckCircle, Warning, Info, Error as ErrorIcon } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { privateApi } from '../api/axios';
import { getActivePointDeVenteId } from '../utils/pdv';

const formatF = (n) => `${Number(n || 0).toLocaleString('fr-FR')} F`;

// =====================
// Item row
// =====================
const ItemRow = ({ item, onDelete }) => {
  const { type, nom, qte, consigne, value } = item;
  const isEspeces = type === 'ESPECES';
  const isManquant = type === 'MANQUANT';

  const total = isEspeces ? Number(value || 0) : (Number(consigne || 0) * Number(qte || 0));

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        bgcolor: isManquant ? 'error.lighter' : 'success.lighter',
        p: 1,
        mb: 1,
        borderRadius: 1,
        border: `1px solid ${isManquant ? 'error.light' : 'success.light'}`
      }}
    >
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
          {isManquant ? '❌ ' : '💰 '}{nom}
        </Typography>

        {!isEspeces && (
          <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            {formatF(consigne)} × {qte} = {formatF(total)}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 'bold',
            fontSize: '0.85rem',
            color: isManquant ? 'error.main' : 'success.main'
          }}
        >
          {formatF(total)}
        </Typography>

        <Tooltip title="Supprimer">
          <IconButton size="small" onClick={onDelete} sx={{ color: 'error.main' }}>
            <Delete sx={{ fontSize: '0.8rem' }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

ItemRow.propTypes = {
  item: PropTypes.object.isRequired,
  onDelete: PropTypes.func.isRequired
};

// =====================
// Ajout rapide (produit ou casier)
/// options: [{id, nom, consigne}]
/// onAdd(id, qte)
// =====================
const AjoutRapide = ({ options, onAdd, label, type = 'produit' }) => {
  const [selected, setSelected] = useState('');
  const [qte, setQte] = useState(1);

  const selectedItem = options.find(opt => String(opt.id) === String(selected));

  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <Box sx={{ flex: 1, minWidth: 150 }}>
        <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontSize: '0.75rem' }}>
          {type === 'produit' ? 'Produit' : 'Type de casier'}
        </Typography>

        <Select
          size="small"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          fullWidth
          displayEmpty
          sx={{ fontSize: '0.8rem' }}
        >
          <MenuItem value="" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
            {label}
          </MenuItem>
          {options.map(opt => (
            <MenuItem key={opt.id} value={opt.id} sx={{ fontSize: '0.8rem' }}>
              {opt.nom} - {formatF(opt.consigne)}
            </MenuItem>
          ))}
        </Select>
      </Box>

      <Box>
        <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontSize: '0.75rem' }}>
          Quantité
        </Typography>
        <TextField
          size="small"
          type="number"
          value={qte}
          onChange={(e) => setQte(Math.max(1, parseInt(e.target.value, 10) || 1))}
          sx={{ width: 88, '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
          InputProps={{ inputProps: { min: 1 } }}
        />
      </Box>

      {selectedItem && (
        <Box sx={{ px: 1 }}>
          <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'info.main' }}>
            Total: {formatF(selectedItem.consigne * qte)}
          </Typography>
        </Box>
      )}

      <Button
        variant="contained"
        size="small"
        onClick={() => {
          onAdd(selected, qte);
          setSelected('');
          setQte(1);
        }}
        disabled={!selected}
        sx={{ minWidth: 42, height: 40 }}
      >
        <Add />
      </Button>
    </Box>
  );
};

AjoutRapide.propTypes = {
  options: PropTypes.array.isRequired,
  onAdd: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['produit', 'casier'])
};

// =====================
// MAIN
// =====================
const LivraisonSimple = ({ livraison, onValidate, onClose }) => {
  // Dialog
  const [open, setOpen] = useState(false);

  // Wizard step: 1 (non rendus) -> 2 (règlement) -> 3 (confirmation)
  const [wizardStep, setWizardStep] = useState(1);

  // Data
  const [manquants, setManquants] = useState([]);
  const [compensations, setCompensations] = useState([]);
  const [typeCasiers, setTypeCasiers] = useState([]);
  const [compType, setCompType] = useState('CASIER');
  const [montantEspeces, setMontantEspeces] = useState('');

  const [tousLesCasiersRendus, setTousLesCasiersRendus] = useState(true);
  const [erreur, setErreur] = useState('');
  const [loading, setLoading] = useState(false);

  // Snackbar (notif)
  const [snack, setSnack] = useState({ open: false, title: '', message: '', severity: 'success' });
  const showSnack = ({ title, message, severity = 'success' }) =>
    setSnack({ open: true, title, message, severity });
  const closeSnack = () => setSnack(s => ({ ...s, open: false }));

  // Responsive: full screen dialog on mobile
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // =====================
  // Load type casiers
  // =====================
  useEffect(() => {
    const pvId = getActivePointDeVenteId();
    if (!pvId) return;

    setLoading(true);
    privateApi
      .get(`/api/type-casiers/point-de-vente/${pvId}/consignables`)
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : [];
        const transformed = data.map(tc => {
          const consigneTotale = Number(tc.consigneTotaleParCasier || tc.consigne_totale || 0);
          return {
            id: String(tc.id),
            nom: tc.nomDisplay || tc.nom_display || 'Casier',
            consigne: consigneTotale
          };
        });
        setTypeCasiers(transformed);
        setErreur('');
      })
      .catch(err => {
        console.error(err);
        setErreur('Impossible de charger les types de casiers');
        setTypeCasiers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // =====================
  // Articles (consigneTotale)
  // =====================
  const articles = useMemo(() => {
    const arts = livraison?.details || livraison?.articles || [];
    return arts.map(a => {
      const consigneCasier = Number(a.consigneCasier || 0);
      const consigneBouteille = Number(a.consigneBouteille || 0);
      const nbBouteilles = Number(
        a.nombreBouteillesParCasier ||
        a.nbBouteillesParCasier ||
        a.nbreBouteillesParCasier ||
        0
      );
      const consigneTotale = consigneCasier + (consigneBouteille * nbBouteilles);
      return { ...a, consigneTotale };
    });
  }, [livraison]);

  const produits = useMemo(() => {
    return articles.map(a => {
      const nom = a.nomProduit || a.designation || 'Produit';
      const consigne = Number(a.consigneTotale || 0);
      return { id: String(a.produitId || a.id), nom, consigne };
    });
  }, [articles]);

  // =====================
  // Totaux
  // =====================
  const totalBrut = useMemo(() => Number(livraison?.montantTotal || livraison?.totalGeneral || 0), [livraison]);

  // Valeur des emballages livrés (repère) = somme(consigneTotale * qte)
  const totalConsigne = useMemo(() => {
    return articles.reduce((sum, a) => {
      const qte = Number(a.quantiteLivree || a.quantite || 1);
      return sum + (Number(a.consigneTotale || 0) * qte);
    }, 0);
  }, [articles]);

  const totalNet = useMemo(() => totalBrut - totalConsigne, [totalBrut, totalConsigne]);

  // Non rendus déclarés (dette consigne réelle)
  const totalManquants = useMemo(
    () => manquants.reduce((sum, m) => sum + (Number(m.consigne || 0) * Number(m.qte || 0)), 0),
    [manquants]
  );

  // Règlement / équivalent
  const totalCompensations = useMemo(
    () => compensations.reduce((sum, c) => {
      if (c.type === 'ESPECES') return sum + Number(c.value || 0);
      return sum + (Number(c.consigne || 0) * Number(c.qte || 0));
    }, 0),
    [compensations]
  );

  // Solde consigne: + => client doit, 0 => soldé, - => surplus
  const soldeConsigne = Number(totalManquants) - Number(totalCompensations);

  // Montant final à encaisser : total boisson + (solde positif)
  const montantFinal = useMemo(() => totalBrut + Math.max(0, soldeConsigne), [totalBrut, soldeConsigne]);

  // Progression "réglé" basée sur non rendus (si non rendus = 0, progress inutilisable)
  const pourcentageRegle = totalManquants > 0
    ? Math.min(100, Math.round((totalCompensations / totalManquants) * 100))
    : 0;

  // =====================
  // Helpers / actions
  // =====================
  const resetWizard = () => {
    setWizardStep(1);
    setErreur('');
    setManquants([]);
    setCompensations([]);
    setCompType('CASIER');
    setMontantEspeces('');
  };

  const openWizard = () => {
    resetWizard();
    setOpen(true);
  };

  const closeWizard = () => {
    setErreur('');
    setOpen(false);
  };

  const ajouterManquant = (produitId, qte) => {
    if (!produitId) return setErreur('Veuillez sélectionner un produit');

    const produit = produits.find(p => p.id === String(produitId));
    if (!produit) return setErreur('Produit non trouvé');

    // si consigne=0, on bloque (sinon ton écran devient “0F”)
    if (!produit.consigne || Number(produit.consigne) <= 0) {
      return setErreur(`La consigne de "${produit.nom}" est à 0. Vérifie les données livraison.`);
    }

    setErreur('');
    setManquants(prev => [...prev, { ...produit, qte: Number(qte), type: 'MANQUANT' }]);
  };

  const ajouterCompensationCasier = (typeId, qte) => {
    if (!typeId) return setErreur('Veuillez sélectionner un type de casier');

    const type = typeCasiers.find(t => String(t.id) === String(typeId));
    if (!type) return setErreur('Type de casier non trouvé');

    if (!type.consigne || Number(type.consigne) <= 0) {
      return setErreur('La valeur de ce casier est à 0. Vérifie les données des types de casiers.');
    }

    setErreur('');
    setCompensations(prev => [...prev, { type: 'CASIER', ...type, qte: Number(qte) }]);
  };

  const ajouterCompensationEspeces = () => {
    const value = Number(montantEspeces);
    if (value <= 0 || isNaN(value)) return setErreur('Veuillez saisir un montant valide et positif');

    setErreur('');
    setCompensations(prev => [...prev, { type: 'ESPECES', nom: 'Espèces', value }]);
    setMontantEspeces('');
  };

  const handleToutOk = () => {
    // Cas normal : consigne soldée (équivalent rendu)
    onValidate?.({
      venteId: livraison?.id,
      casiersRendus: 0,
      bouteillesRendues: 0,
      montantPaye: totalNet,
      modePaiement: 'LIQUIDE',
      consigneSoldee: true
    });

    showSnack({
      title: '✔️ Livraison clôturée',
      message: 'Encaissement effectué — emballages soldés.',
      severity: 'success'
    });

    onClose?.();
  };

  const handleCloturerAvecReglement = () => {
    // Validation finale du wizard
    onValidate?.({
      venteId: livraison?.id,
      montantPaye: montantFinal,
      modePaiement: 'LIQUIDE',
      consigneSoldee: soldeConsigne <= 0,
      manquants,
      compensations,
      soldeConsigne
    });

    showSnack({
      title: '✔️ Livraison clôturée',
      message: 'Règlement des emballages enregistré.',
      severity: 'success'
    });

    setOpen(false);
    onClose?.();
  };

  // =====================
  // Wizard navigation rules
  // =====================
  const canNextFromStep1 = true; // autoriser next même si 0, mais on affichera un hint
  const canNextFromStep2 =
    (totalManquants === 0) ? true : (totalCompensations > 0); // si non rendus > 0, il faut un règlement

  const next = () => {
    setErreur('');
    setWizardStep(s => Math.min(3, s + 1));
  };

  const back = () => {
    setErreur('');
    setWizardStep(s => Math.max(1, s - 1));
  };

  // =====================
  // Loading
  // =====================
  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography>Chargement des données...</Typography>
      </Box>
    );
  }

  // =====================
  // Render wizard steps
  // =====================
  const WizardHeader = () => (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 2,
        bgcolor: 'info.lighter',
        borderColor: 'info.main'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Typography sx={{ fontWeight: 900, fontSize: '0.95rem', color: 'info.dark' }}>
          Valeur des emballages livrés
        </Typography>
        <Typography sx={{ fontWeight: 900, fontSize: '1.05rem', color: 'info.dark' }}>
          {formatF(totalConsigne)}
        </Typography>
      </Box>

      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
        Étape {wizardStep}/3
      </Typography>

      {wizardStep !== 3 && (
        <Box sx={{ mt: 1.5 }}>
          <LinearProgress
            variant="determinate"
            value={(wizardStep / 3) * 100}
            sx={{ height: 8, borderRadius: 999 }}
          />
        </Box>
      )}
    </Paper>
  );

  const Step1NonRendus = () => (
    <Box>
      <Typography sx={{ fontWeight: 900, mb: 1, color: 'error.main' }}>
        1) Emballages non rendus
      </Typography>

      <AjoutRapide
        options={produits}
        onAdd={ajouterManquant}
        label="Sélectionner un produit"
        type="produit"
      />

      <Box sx={{ maxHeight: fullScreen ? 220 : 200, overflow: 'auto' }}>
        {manquants.length === 0 ? (
          <Typography
            variant="body2"
            sx={{
              textAlign: 'center',
              color: 'text.secondary',
              fontStyle: 'italic',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1
            }}
          >
            Aucun non rendu déclaré pour le moment.
          </Typography>
        ) : (
          manquants.map((m, idx) => (
            <ItemRow
              key={idx}
              item={{ ...m, type: 'MANQUANT' }}
              onDelete={() => setManquants(manquants.filter((_, i) => i !== idx))}
            />
          ))
        )}
      </Box>

      <Paper variant="outlined" sx={{ mt: 2, p: 1.25, bgcolor: 'error.lighter' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 800 }}>Non rendus déclarés</Typography>
          <Typography sx={{ fontWeight: 900, color: 'error.main' }}>{formatF(totalManquants)}</Typography>
        </Box>
      </Paper>

      {totalManquants === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Si rien ne manque, tu peux fermer et activer “Équivalent rendu” sur l’écran précédent.
        </Alert>
      )}
    </Box>
  );

  const Step2Reglement = () => (
    <Box>
      <Typography sx={{ fontWeight: 900, mb: 1, color: 'success.main' }}>
        2) Règlement / équivalent fourni
      </Typography>

      <Paper variant="outlined" sx={{ p: 1.25, mb: 2, bgcolor: 'grey.50' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 800 }}>Non rendus</Typography>
          <Typography sx={{ fontWeight: 900 }}>{formatF(totalManquants)}</Typography>
        </Box>
      </Paper>

      <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
        Type de règlement
      </Typography>

      <Select
        size="small"
        value={compType}
        onChange={(e) => setCompType(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      >
        <MenuItem value="CASIER">Casier / emballage équivalent</MenuItem>
        <MenuItem value="ESPECES">Espèces</MenuItem>
      </Select>

      {compType === 'CASIER' ? (
        <AjoutRapide
          options={typeCasiers}
          onAdd={ajouterCompensationCasier}
          label="Sélectionner un type de casier"
          type="casier"
        />
      ) : (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', mb: 2 }}>
          <TextField
            size="small"
            type="number"
            value={montantEspeces}
            onChange={(e) => setMontantEspeces(e.target.value)}
            fullWidth
            label="Montant espèces"
            InputProps={{ endAdornment: 'F' }}
          />
          <Button
            variant="contained"
            onClick={ajouterCompensationEspeces}
            disabled={!montantEspeces || Number(montantEspeces) <= 0}
            sx={{ minWidth: 42, height: 40 }}
          >
            <Add />
          </Button>
        </Box>
      )}

      <Box sx={{ maxHeight: fullScreen ? 220 : 200, overflow: 'auto' }}>
        {compensations.length === 0 ? (
          <Typography
            variant="body2"
            sx={{
              textAlign: 'center',
              color: 'text.secondary',
              fontStyle: 'italic',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1
            }}
          >
            Aucun règlement saisi.
          </Typography>
        ) : (
          compensations.map((c, idx) => (
            <ItemRow
              key={idx}
              item={c.type === 'ESPECES' ? { ...c, type: 'ESPECES' } : { ...c, type: 'COMPENSATION' }}
              onDelete={() => setCompensations(compensations.filter((_, i) => i !== idx))}
            />
          ))
        )}
      </Box>

      <Paper variant="outlined" sx={{ mt: 2, p: 1.25, bgcolor: 'success.lighter' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 800 }}>Total réglé</Typography>
          <Typography sx={{ fontWeight: 900, color: 'success.main' }}>{formatF(totalCompensations)}</Typography>
        </Box>
      </Paper>

      <Paper
        variant="outlined"
        sx={{
          mt: 2,
          p: 1.25,
          bgcolor: soldeConsigne > 0 ? 'error.lighter' : soldeConsigne < 0 ? 'warning.lighter' : 'success.lighter',
          borderColor: soldeConsigne > 0 ? 'error.main' : soldeConsigne < 0 ? 'warning.main' : 'success.main'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 900 }}>Solde consigne</Typography>
          <Typography sx={{ fontWeight: 900 }}>
            {soldeConsigne > 0 ? '+' : ''}{formatF(soldeConsigne)}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {soldeConsigne > 0
            ? 'Client doit encore'
            : soldeConsigne < 0
              ? 'Surplus (avoir possible)'
              : 'Parfaitement soldé'}
        </Typography>
      </Paper>

      {totalManquants > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
            Avancement du règlement
          </Typography>
          <LinearProgress
            variant="determinate"
            value={pourcentageRegle}
            sx={{ height: 8, borderRadius: 999 }}
          />
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
            {pourcentageRegle}% réglé
          </Typography>
        </Box>
      )}
    </Box>
  );

  const Step3Confirmation = () => (
    <Box>
      <Typography sx={{ fontWeight: 900, mb: 1, color: 'primary.main' }}>
        3) Confirmation
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Box>
            <Typography variant="caption">Emballages livrés</Typography>
            <Typography sx={{ fontWeight: 900 }}>{formatF(totalConsigne)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption">Non rendus</Typography>
            <Typography sx={{ fontWeight: 900, color: 'error.main' }}>{formatF(totalManquants)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption">Réglé</Typography>
            <Typography sx={{ fontWeight: 900, color: 'success.main' }}>{formatF(totalCompensations)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption">Solde consigne</Typography>
            <Typography sx={{ fontWeight: 900 }}>
              {soldeConsigne > 0 ? '+' : ''}{formatF(soldeConsigne)}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Montant boisson (brut)
        </Typography>
        <Typography sx={{ fontWeight: 900, fontSize: '1.1rem' }}>
          {formatF(totalBrut)}
        </Typography>

        <Paper
          variant="outlined"
          sx={{
            mt: 2,
            p: 2,
            bgcolor: 'primary.lighter',
            borderColor: 'primary.main',
            borderWidth: 2,
            textAlign: 'center'
          }}
        >
          <Typography sx={{ fontWeight: 900, mb: 0.5 }}>
            MONTANT TOTAL À ENCAISSER
          </Typography>
          <Typography sx={{ fontWeight: 900, fontSize: '1.4rem' }}>
            {formatF(montantFinal)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {soldeConsigne > 0 ? `Inclut solde consigne +${formatF(soldeConsigne)}` : 'Aucun solde supplémentaire'}
          </Typography>
        </Paper>
      </Paper>

      {totalManquants > 0 && totalCompensations === 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Tu as déclaré des non rendus mais aucun règlement. Retourne à l’étape 2.
        </Alert>
      )}
    </Box>
  );

  // =====================
  // MAIN RENDER
  // =====================
  return (
    <Box sx={{ p: 2, maxWidth: 420, mx: 'auto' }}>
      <Typography variant="h6" align="center" gutterBottom sx={{ fontSize: '1rem', fontWeight: 900 }}>
        🚚 Livraison - {livraison?.nomClient || livraison?.clientNom || 'Client'}
      </Typography>

      {/* DÉTAIL LIVRAISON (simple, tu peux remettre ton rendu détaillé) */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography sx={{ fontWeight: 900, color: 'primary.main', mb: 1 }}>
          📦 Résumé
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography>Valeur emballages livrés</Typography>
          <Typography sx={{ fontWeight: 900, color: 'warning.main' }}>
            {formatF(totalConsigne)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography>Total brut</Typography>
          <Typography sx={{ fontWeight: 900 }}>{formatF(totalBrut)}</Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, pt: 1, borderTop: '1px dashed #ccc' }}>
          <Typography sx={{ fontWeight: 900 }}>
            {tousLesCasiersRendus ? 'TOTAL À ENCAISSER' : 'TOTAL BRUT'}
          </Typography>
          <Typography sx={{ fontWeight: 900, color: 'primary.main' }}>
            {formatF(tousLesCasiersRendus ? totalNet : totalBrut)}
          </Typography>
        </Box>
      </Paper>

      {/* SWITCH */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: tousLesCasiersRendus ? 'success.lighter' : 'warning.lighter' }}>
        <FormControlLabel
          control={
            <Switch
              checked={tousLesCasiersRendus}
              onChange={(e) => setTousLesCasiersRendus(e.target.checked)}
              color="success"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontWeight: 900 }}>
                {tousLesCasiersRendus ? '✅ ÉQUIVALENT D’EMBALLAGES RENDU' : '⚠️ EMBALLAGES NON RENDUS / PARTIEL'}
              </Typography>
              <Tooltip title="Si OFF, tu saisis les non rendus et leur règlement.">
                <Info sx={{ fontSize: '0.95rem', color: 'info.main' }} />
              </Tooltip>
            </Box>
          }
          sx={{ m: 0 }}
        />
      </Paper>

      {/* ACTIONS ÉCRAN 1 */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Button
          fullWidth
          variant="contained"
          color="success"
          startIcon={<CheckCircle />}
          onClick={handleToutOk}
          disabled={!tousLesCasiersRendus}
          sx={{ py: 1.4, fontWeight: 900 }}
        >
          ENCAISSER & CLÔTURER • {formatF(totalNet).replace(' F', '')}
        </Button>

        <Button
          fullWidth
          variant="contained"
          color="warning"
          startIcon={<Warning />}
          onClick={openWizard}
          disabled={tousLesCasiersRendus}
          sx={{ py: 1.4, fontWeight: 900 }}
        >
          RÈGLER LES EMBALLAGES NON RENDUS
        </Button>
      </Box>

      {/* DIALOG WIZARD */}
      <Dialog
        open={open}
        onClose={closeWizard}
        fullWidth
        maxWidth="sm"
        fullScreen={fullScreen}
        PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 2 } }}
      >
        <DialogContent sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 900, textAlign: 'center', mb: 1 }}>
            ♻️ Règlement des emballages
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mb: 2 }}>
            Déclare ce qui manque, enregistre le règlement, puis clôture.
          </Typography>

          {erreur && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErreur('')}>
              {erreur}
            </Alert>
          )}

          <WizardHeader />

          {wizardStep === 1 && <Step1NonRendus />}
          {wizardStep === 2 && <Step2Reglement />}
          {wizardStep === 3 && <Step3Confirmation />}
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1, bgcolor: 'grey.50' }}>
          {/* Left side */}
          <Button onClick={closeWizard} variant="outlined">
            Annuler
          </Button>

          <Box sx={{ flex: 1 }} />

          {/* Back */}
          <Button onClick={back} disabled={wizardStep === 1}>
            Retour
          </Button>

          {/* Next / Final */}
          {wizardStep < 3 ? (
            <Button
              variant="contained"
              onClick={next}
              disabled={
                (wizardStep === 1 && !canNextFromStep1) ||
                (wizardStep === 2 && !canNextFromStep2)
              }
              sx={{ fontWeight: 900 }}
            >
              Suivant
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              onClick={handleCloturerAvecReglement}
              disabled={totalManquants > 0 && totalCompensations === 0}
              sx={{ fontWeight: 900 }}
            >
              ENCAISSER & CLÔTURER
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* SNACKBAR */}
      <Snackbar
        open={snack.open}
        autoHideDuration={2800}
        onClose={closeSnack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={closeSnack} severity={snack.severity} variant="filled" sx={{ width: '100%' }}>
          <Typography sx={{ fontWeight: 900, lineHeight: 1.2 }}>
            {snack.title}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.95 }}>
            {snack.message}
          </Typography>
        </Alert>
      </Snackbar>
    </Box>
  );
};

LivraisonSimple.propTypes = {
  livraison: PropTypes.object.isRequired,
  onValidate: PropTypes.func.isRequired,
  onClose: PropTypes.func
};

export default LivraisonSimple;
