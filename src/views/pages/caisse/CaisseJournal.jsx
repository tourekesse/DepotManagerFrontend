import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Alert,
  TextField,
  Chip,
  Pagination,
  Paper
} from '@mui/material';
import { Add, Speed, Search } from '@mui/icons-material';
import { privateApi } from '../../../api/axios';
import useActivePointDeVenteId from '../../../hooks/useActivePointDeVenteId';

const ITEMS_PER_PAGE = 8;

export default function CaisseJournal() {
  const navigate = useNavigate();
  const pvId = useActivePointDeVenteId();
  const [caisse, setCaisse] = useState(null);
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [caisseOuverte, setCaisseOuverte] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!pvId) return;
    chargerJournal(pvId);
  }, [pvId]);

  const chargerJournal = async (activePvId) => {
    setLoading(true);
    setError(null);
    
    console.log('🔍 Debug CaisseJournal - pvId utilisé:', activePvId);

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const responseStatut = await privateApi.get(`/api/caisse/statut?pvId=${activePvId}`);
      console.log('📊 Réponse statut caisse:', responseStatut.data);
      setCaisseOuverte(responseStatut.data);
      
      if (responseStatut.data) {
        const responseCaisse = await privateApi.get(`/api/caisse/aujourd-hui?pvId=${activePvId}`);
        setCaisse(responseCaisse.data);
        
        const responseMvt = await privateApi.get(`/api/caisse/mouvements?pvId=${activePvId}&date=${today}`);
        setMouvements(responseMvt.data || []);
      }
    } catch (err) {
      console.error('Erreur chargement journal:', err);
      setError('Erreur lors du chargement du journal');
    } finally {
      setLoading(false);
    }
  };

  const getTypeLibelle = (type) => {
    const types = {
      'OUVERTURE_CAISSE': '🔓 Ouverture caisse',
      'FERMETURE_CAISSE': '🔒 Fermeture caisse',
      'DEPOT_CAISSE': '💰 Entrée d\'argent',
      'VENTE': '🧾 Encaissement vente',
      'LIVRAISON': '🚚 Encaissement livraison',
      'REPORT_SOLDE': '↩️ Report solde veille',
      'RECETTE_AUTRE': '➕ Recette',
      'DEPENSE': '💸 Sortie d\'argent',
      'RETRAIT_CAISSE': '💸 Retrait caisse',
      'RETOUR_CASIER': '♻️ Remboursement consigne',
      'ECART_POSITIF': '📊 Surplus caisse',
      'ECART_NEGATIF': '⚠️ Manque caisse',
    };
    return types[type] || type;
  };

  const getTypeColor = (type) => {
    if (['DEPOT_CAISSE', 'ECART_POSITIF', 'OUVERTURE_CAISSE', 'VENTE', 'LIVRAISON', 'REPORT_SOLDE', 'RECETTE_AUTRE'].includes(type)) return 'success';
    if (['DEPENSE', 'ECART_NEGATIF', 'RETRAIT_CAISSE', 'RETOUR_CASIER'].includes(type)) return 'error';
    return 'default';
  };

  const formatMontant = (montant) => {
    return new Intl.NumberFormat('fr-FR').format(montant || 0);
  };

  // Filtrer les mouvements
  const filteredMouvements = useMemo(() => {
    if (!searchTerm) return mouvements;
    
    const term = searchTerm.toLowerCase();
    return mouvements.filter(mvt => 
      (mvt.typeOperation?.libelle || getTypeLibelle(mvt.type)).toLowerCase().includes(term) ||
      (mvt.commentaire || '').toLowerCase().includes(term) ||
      formatMontant(mvt.montant).includes(term)
    );
  }, [mouvements, searchTerm]);

  // Paginer
  const totalPages = Math.ceil(filteredMouvements.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedMouvements = filteredMouvements.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  if (loading) {
    return <Box sx={{ p: 2 }}><Typography>Chargement...</Typography></Box>;
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: '100%' }}>
      <Card>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          {/* Header */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Journal - {new Date().toLocaleDateString('fr-FR')}
            </Typography>
            
            {caisse && (
              <Box sx={{ p: 1, bgcolor: 'primary.main', borderRadius: 1, mb: 2 }}>
                <Typography variant="body2" color="white" sx={{ fontWeight: 'bold' }}>
                  Solde: {formatMontant(caisse.soldeFinal)} FCFA
                </Typography>
              </Box>
            )}
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {!caisseOuverte && !loading && (
            <Alert
              severity="warning"
              sx={{
                mb: 2,
                display: 'flex',
                alignItems: { xs: 'stretch', sm: 'center' },
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1.5
              }}
            >
              <Box sx={{ flex: 1, minWidth: 220 }}>
                <Typography fontWeight={600}>Caisse fermée</Typography>
                <Typography variant="body2">
                  Ouvrez la caisse pour enregistrer vos opérations du jour.
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="warning"
                onClick={() => navigate('/accueil/caisse/ouverture')}
              >
                Ouvrir la caisse
              </Button>
            </Alert>
          )}

          {/* Recherche */}
          <TextField
            fullWidth
            size="small"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            InputProps={{ startAdornment: <Search sx={{ mr: 1, fontSize: 20 }} /> }}
            sx={{ mb: 2 }}
          />

          {/* Boutons d'action - TOUJOURS visibles */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {/* Bouton d'ouverture - visible si caisse fermée */}
            {!caisseOuverte && (
              <Button 
                variant="contained"
                color="warning"
                size="large"
                startIcon={<Add />}
                onClick={() => navigate('/accueil/caisse/ouverture')}
                sx={{ 
                  fontWeight: 'bold',
                  px: 3,
                  py: 1.5
                }}
              >
                🔓 Ouvrir la caisse
              </Button>
            )}
            
            {/* Boutons d'opération - visibles si caisse ouverte */}
            {caisseOuverte && (
              <>
                <Button 
                  size="small"
                  variant="contained"
                  color="success"
                  onClick={() => navigate('/accueil/caisse/ajuster-client')}
                >
                  👤 Opération Client
                </Button>
                <Button 
                  size="small"
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => navigate('/accueil/caisse/mouvement')}
                >
                  Autre Opération
                </Button>
                <Button 
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => navigate('/accueil/caisse/fermeture')}
                >
                  🔒 Fermer la caisse
                </Button>
              </>
            )}
          </Box>

          {/* Debug info - temporaire */}
          {process.env.NODE_ENV === 'development' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                🐛 Debug: caisseOuverte = {caisseOuverte ? 'true' : 'false'} | 
                pvId = {pvId} | 
                mouvements = {mouvements.length}
              </Typography>
            </Alert>
          )}

          {/* Mouvements */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {paginatedMouvements.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                {searchTerm ? 'Aucun résultat' : 'Aucune opération'}
              </Typography>
            ) : (
              paginatedMouvements.map((mvt, idx) => (
                <Paper key={idx} sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {mvt.typeOperation?.libelle || getTypeLibelle(mvt.type)}
                      </Typography>
                      {mvt.commentaire && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          {mvt.commentaire}
                        </Typography>
                      )}
                      <Chip 
                        label={getTypeLibelle(mvt.type)} 
                        color={getTypeColor(mvt.type)}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    <Box sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Typography 
                        variant="body2" 
                        sx={{ fontWeight: 600, mb: 0.5 }}
                        color={getTypeColor(mvt.type)}
                      >
                        {['DEPOT_CAISSE', 'ECART_POSITIF', 'OUVERTURE_CAISSE', 'VENTE', 'LIVRAISON', 'REPORT_SOLDE', 'RECETTE_AUTRE'].includes(mvt.type) ? '+' : '-'}
                        {formatMontant(mvt.montant)} F
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Solde: {formatMontant(mvt.soldeCourant)} F
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              ))
            )}
          </Box>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination 
                count={totalPages} 
                page={currentPage}
                onChange={(e, page) => setCurrentPage(page)}
                size="small"
              />
            </Box>
          )}


        </CardContent>
      </Card>
    </Box>
  );
}
