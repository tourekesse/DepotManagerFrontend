import React from 'react';
import { Box, Typography, TextField, Divider } from '@mui/material';

// Groupes de liquides AVEC consignes (bières, sodas, malta)
// IDs de la table groupeliquide : 11=BIERE, 13=SODA, 16=MALTA
const GROUPES_AVEC_CONSIGNES = [11, 13, 16];

export default function ConsignesSection({ 
  id,
  prixBouteille, 
  prixCasierPlastique, 
  nbreBouteillesParCasier,
  groupeliquideId,
  onChange 
}) {
  // Vérifier si le groupe a des consignes
  const showConsignes = groupeliquideId ? GROUPES_AVEC_CONSIGNES.includes(groupeliquideId) : true;
  
  const emballageTotal = (prixBouteille || 0) * (nbreBouteillesParCasier || 0) + (prixCasierPlastique || 0);

  if (!showConsignes) {
    return (
      <Box sx={{ gridColumn: '1 / -1', mb: 1 }}>
        <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2, border: '1px solid #e0e0e0' }}>
          <Typography variant="body2" sx={{ color: '#757575' }}>
            ℹ️ Ce type de produit n'a pas de consignes (emballage perdu)
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ gridColumn: '1 / -1', mb: 1 }} id={`consignes-section-${id}`}>
      <Divider sx={{ mb: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 800, color: '#2e7d32' }}>
          📦 INFORMATIONS CONSIGNES
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
            onChange={(e) => onChange('prixBouteille', e.target.value)}
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
            onChange={(e) => onChange('prixCasierPlastique', e.target.value)}
          />
        </Box>
      </Box>
      {/* Total emballage - Affiché juste après les consignes */}
      <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#e3f2fd', borderRadius: 2, border: '1px solid #90caf9' }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: '#1565c0' }}>
          💰 Total emballage (indicatif) : {emballageTotal} FCFA
        </Typography>
        <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 0.5 }}>
          Calcul : ({prixBouteille || 0} × {nbreBouteillesParCasier || 0}) + {prixCasierPlastique || 0}
        </Typography>
      </Box>
    </Box>
  );
}
