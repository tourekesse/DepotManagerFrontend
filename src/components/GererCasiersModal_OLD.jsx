import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Button, Dialog, DialogContent, DialogActions, Typography,
  Select, MenuItem, TextField, IconButton, Paper, Divider,
  Checkbox, FormControlLabel, Stack
} from '@mui/material';
import { Delete, Add, CheckCircle, LocalShipping, ReceiptLong } from '@mui/icons-material';
import { privateApi } from '../api/axios';
import { getActivePointDeVenteId } from '../utils/pdv';

const formatF = (n) => `${Number(n || 0).toLocaleString('fr-FR')} F`;

const ItemRow = ({ label, value, onDelete }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'grey.50', p: 0.5, mb: 0.5, borderRadius: 0.5 }}>
    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{label}</Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{value}</Typography>
      <IconButton size="small" onClick={onDelete}><Delete sx={{ fontSize: '0.8rem' }} /></IconButton>
    </Box>
  </Box>
);

const GererCasiersModal = ({ open, onClose, vente, ventesCasiers = [], onValidate, clientNom }) => {
  const ventesList = Array.isArray(ventesCasiers) ? ventesCasiers : [];
  const [compensations, setCompensations] = useState([]);
  const [typeCasiers, setTypeCasiers] = useState([]);
  const [compType, setCompType] = useState('CASIER');
  const [montantEspeces, setMontantEspeces] = useState(0);
  const [paiementRecu, setPaiementRecu] = useState(false); // Nouveau: paiement reçu par le gérant
  const [selectedVenteId, setSelectedVenteId] = useState(null);
  const [venteDetails, setVenteDetails] = useState(null);

  const currentVente = useMemo(() => {
    if (ventesList.length) {
      const found = ventesList.find(v => String(v.venteId || v.id) === String(selectedVenteId));
      return found || ventesList[0];
    }
    return vente || null;
  }, [ventesList, selectedVenteId, vente]);

  // Pas besoin d'appel API supplémentaire, utiliser les données existantes
  // Les commandes dans la liste ont déjà toutes les informations nécessaires

  useEffect(() => {
    if (!open) return;
    const pvId = getActivePointDeVenteId();
    privateApi.get(`/api/type-casiers/point-de-vente/${pvId}/consignables`)
      .then(res => setTypeCasiers(res.data.map(tc => ({
        id: String(tc.id),
        nom: tc.nomDisplay,
        consigne: Number(tc.consigneTotaleParCasier || 0)
      }))))
      .catch(() => setTypeCasiers([]));
  }, [open]);

  useEffect(() => {
    if (!open) {
      setCompensations([]); setMontantEspeces(0); setCompType('CASIER');
      setSelectedVenteId(null);
      setVenteDetails(null);
      setPaiementRecu(false); // Réinitialiser le paiement reçu
    }
  }, [open]);

  // Utiliser les montants précalculés depuis la commande (plus de calculs complexes)
  const mtEmballage = Number(currentVente?.montantEmballage || currentVente?.mtEmballage || 0);
  const mtLiquide = Number(currentVente?.montantLiquide || 0);
  
  // Debug pour voir les données reçues
  console.log('DEBUG - Modal data:', {
    currentVente,
    mtEmballage,
    mtLiquide,
    montantTotal: currentVente?.montantTotal
  });
  const totalCompensations = useMemo(() => 
    compensations.reduce((sum, c) => c.type === 'ESPECES' ? sum + Number(c.value || 0) : sum + (Number(c.consigne || 0) * Number(c.qte || 0)), 0),
    [compensations]
  );
  const solde = mtEmballage - totalCompensations;

  const handleRetourComplet = async () => {
    try {
      const id = currentVente.venteId || currentVente.id;
      await privateApi.post(`/api/commandes/${id}/valider-probleme`, {
        manquants: [], compensations: [], commentaire: 'Retour complet'
      });
      onValidate?.(); onClose();
    } catch (error) {
      alert('Erreur: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleValiderCompensation = async () => {
    try {
      const id = currentVente.venteId || currentVente.id;
      const payload = {
        compensations: compensations.map(c => c.type === 'ESPECES' ? 
          { type: 'ESPECES', montant: Number(c.value) } : 
          { type: 'CASIER', typeCasierId: Number(c.id), quantite: Number(c.qte) }),
        commentaire: `Compensation #${id}`
      };
      await privateApi.post(`/api/commandes/${id}/valider-probleme`, payload);
      onValidate?.(); onClose();
    } catch (error) {
      alert('Erreur: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogContent sx={{ p: 2 }}>
        <Typography variant="h6" align="center" gutterBottom sx={{ fontSize: '1rem' }}>
          <LocalShipping /> Gérer Casiers - {clientNom}
        </Typography>

        {currentVente && (
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: '#fff3e0' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Commande #{currentVente.venteId || currentVente.id}</Typography>
            
            {/* Infos client et date */}
            <Box sx={{ mt: 1, mb: 2 }}>
              <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>
                📅 {currentVente.dateVente ? new Date(currentVente.dateVente).toLocaleDateString('fr-FR', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Date inconnue'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>
                👤 {clientNom}
              </Typography>
            </Box>
            
            {/* Résumé des montants */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                💰 Total Liquide: {formatF(mtLiquide)}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#d32f2f' }}>
                📦 Emballages: {formatF(mtEmballage)}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.95rem', mt: 0.5 }}>
                💳 TOTAL: {formatF(Number(currentVente?.montantTotal || 0))}
              </Typography>
              
              {/* Ligne claire pour le gérant */}
              <Box sx={{ mt: 2, p: 1, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1565c0' }}>
                  💵 Somme à percevoir en espèces: {formatF(mtLiquide)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 0.5 }}>
                  (Si tous les casiers sont rendus)
                </Typography>
              </Box>
              
              {/* Validation du paiement reçu */}
              <Box sx={{ mt: 1.5 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={paiementRecu}
                      onChange={(e) => setPaiementRecu(e.target.checked)}
                      size="small"
                      color="success"
                    />
                  }
                  label={
                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                      ✅ Paiement reçu en espèces
                    </Typography>
                  }
                />
              </Box>
            </Box>
            
            {/* Détail des produits */}
            {currentVente.lignes?.length > 0 && (
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #ddd' }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#555', mb: 1, display: 'block' }}>
                  📋 Détail des produits:
                </Typography>
                {currentVente.lignes.map((ligne, idx) => (
                  <Box key={idx} sx={{ mb: 0.5, fontSize: '0.75rem' }}>
                    <Typography variant="caption" sx={{ color: '#333' }}>
                      • {ligne.produitNom || ligne.produit?.nomProduit}: {formatF(ligne.prixUnitaire)} × {ligne.quantite}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        )}

        <Button fullWidth variant="contained" color="success" onClick={handleRetourComplet} sx={{ mb: 2 }}>
          RETOUR COMPLET DES CASIERS
        </Button>

        <Divider sx={{ mb: 2 }}><Typography variant="caption">OU COMPENSATION</Typography></Divider>

        <Box sx={{ mb: 2 }}>
            <Select size="small" fullWidth value={compType} onChange={(e) => setCompType(e.target.value)} sx={{ mb: 1 }}>
                <MenuItem value="CASIER">Casier</MenuItem>
                <MenuItem value="ESPECES">Espèces</MenuItem>
            </Select>
            {compType === 'CASIER' ? (
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Select size="small" fullWidth displayEmpty value="" onChange={(e) => {
                        const t = typeCasiers.find(x => x.id === e.target.value);
                        if(t) setCompensations([...compensations, {...t, type:'CASIER', qte:1}]);
                    }}>
                        <MenuItem value="">Choisir un casier</MenuItem>
                        {typeCasiers.map(t => <MenuItem key={t.id} value={t.id}>{t.nom}</MenuItem>)}
                    </Select>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField size="small" fullWidth type="number" label="Montant" value={montantEspeces} onChange={(e) => setMontantEspeces(e.target.value)} />
                    <Button variant="contained" onClick={() => {
                        if(Number(montantEspeces) > 0) {
                            setCompensations([...compensations, {type:'ESPECES', value: Number(montantEspeces)}]);
                            setMontantEspeces(0);
                        }
                    }}>+</Button>
                </Box>
            )}
        </Box>

        <Box sx={{ maxHeight: 150, overflow: 'auto', mb: 2 }}>
            {compensations.map((c, idx) => (
                <ItemRow 
                    key={idx} 
                    label={c.type === 'ESPECES' ? 'Espèces' : c.nom} 
                    value={c.type === 'ESPECES' ? formatF(c.value) : formatF(c.consigne * c.qte)} 
                    onDelete={() => setCompensations(compensations.filter((_, i) => i !== idx))}
                />
            ))}
        </Box>

        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">SOLDE:</Typography>
            <Typography variant="body2" fontWeight="bold" sx={{ color: solde > 0 ? 'error.main' : 'success.main' }}>{formatF(solde)}</Typography>
          </Box>
        </Paper>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={handleValiderCompensation} disabled={compensations.length === 0}>Valider</Button>
      </DialogActions>
    </Dialog>
  );
};

export default GererCasiersModal;