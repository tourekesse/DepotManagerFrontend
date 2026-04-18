import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider
} from '@mui/material';

// Helper: format numbers with thousands separators and append ' F'
const formatF = (n) => `${Number(n || 0).toLocaleString('fr-FR')} F`;

/**
 * Composant PanierLivraison
 * Fiche de livraison simple et claire
 */
const PanierLivraison = ({ livraison }) => {
  const articles = livraison.details || livraison.articles || [];
  const montantEmballage = livraison.montantEmballage || 0;
  // Client et date sont affichés dans l'en-tête du modal
  // pour éviter la duplication, on ne les ré-affiche pas ici.

  // Calculer le total des articles
  const totalArticles = articles.reduce((sum, item) => {
    return sum + ((item.prixUnitaire || 0) * (item.quantite || 0));
  }, 0);

  // Le VRAI total = articles + consigne (pas basé sur totalGeneral du backend)
  const total = totalArticles + montantEmballage;

  return (
    <Paper sx={{ p: 2.5, mb: 3, bgcolor: '#fff', fontFamily: 'monospace' }}>

      {/* Articles vendus */}
      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
        📦 Articles vendus
      </Typography>

      {articles.length > 0 ? (
        <>
          {articles.map((article, idx) => {
            const sousTotal = (article.prixUnitaire || 0) * (article.quantite || 0);
            return (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 0.5,
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                }}
              >
                <Typography variant="body2">
                  {article.nomProduit || `Article ${idx + 1}`}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, ml: 2 }}>
                  <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>
                    {article.quantite || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ minWidth: 70, textAlign: 'right', fontWeight: 'bold' }}>
                    = {formatF(sousTotal)}
                  </Typography>
                </Box>
              </Box>
            );
          })}
          
          {/* Consigne */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              mt: 1.5,
              mb: 1.5,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              color: '#ff9800',
              fontWeight: 'bold',
            }}
          >
            <Typography variant="body2" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
              📦 Consigne ({articles.length} × {formatF(montantEmballage > 0 ? Math.round(montantEmballage / articles.length) : 0)})
            </Typography>
            <Typography variant="body2" sx={{ color: '#ff9800', fontWeight: 'bold', minWidth: 70, textAlign: 'right' }}>
              = {formatF(montantEmballage)}
            </Typography>
          </Box>

          {/* Séparateur */}
          <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />

          {/* Total */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: 'monospace',
              fontSize: '1rem',
              fontWeight: 'bold',
              color: '#1976d2',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#333' }}>
              TOTAL À ENCAISSER
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#1976d2', minWidth: 70, textAlign: 'right' }}>
              = {formatF(total)}
            </Typography>
          </Box>
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Aucun article à livrer
        </Typography>
      )}
    </Paper>
  );
};

export default PanierLivraison;
