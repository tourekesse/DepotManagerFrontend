// Modifications pour BoissonApp.jsx - Intégration PWA
// Ajouter ces modifications à votre composant BoissonApp existant

import React, { useState, useEffect } from 'react';
import { usePWA } from '../hooks/usePWA';
import { useOfflineSales } from '../hooks/useOfflineSales';

// Dans votre composant BoissonApp, ajouter ces hooks :

const BoissonApp = () => {
  // Vos états existants...
  const [boissons, setBoissons] = useState([]);
  const [cart, setCart] = useState([]);
  // ... autres états

  // Hooks PWA
  const { isOnline, showLocalNotification, saveOfflineData } = usePWA();
  const { saveOfflineSale, hasPendingSales } = useOfflineSales();

  // Modifier la fonction de validation de vente pour le mode hors ligne
  const handleValidationVente = async () => {
    const venteData = {
      clientId: clientSelectionne?.id,
      pointDeVenteId: pvId,
      items: cart.map(item => ({
        produitId: item.id,
        quantite: item.quantite,
        prixUnitaire: item.prix
      })),
      total: calculerTotal(),
      modeLivraison: selectedModeLivraison,
      typePaiement: selectedTypePaiement,
      timestamp: Date.now()
    };

    if (isOnline) {
      // Mode en ligne - appel API normal
      try {
        const response = await fetch('/api/ventes/directe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
          },
          body: JSON.stringify(venteData)
        });

        if (response.ok) {
          const result = await response.json();
          showNotification('Vente enregistrée avec succès !', 'success');
          
          // Notification push
          showLocalNotification('✅ Vente validée', {
            body: `${cart.length} produits vendus pour ${calculerTotal()}F`,
            icon: '/logos/icon-pwa.svg'
          });
          
          // Vider le panier
          setCart([]);
          setShowCartModal(false);
          
        } else {
          throw new Error('Erreur lors de l\'enregistrement');
        }
      } catch (error) {
        console.error('❌ Erreur vente en ligne:', error);
        showNotification('Erreur réseau, sauvegarde en mode hors ligne...', 'warning');
        
        // Sauvegarder en mode hors ligne en cas d'erreur
        await handleOfflineSale(venteData);
      }
    } else {
      // Mode hors ligne
      await handleOfflineSale(venteData);
    }
  };

  // Gérer la vente hors ligne
  const handleOfflineSale = async (venteData) => {
    try {
      await saveOfflineSale(venteData);
      
      showNotification('Vente sauvegardée hors ligne', 'info');
      
      // Notification locale
      showLocalNotification('💾 Vente hors ligne', {
        body: 'La vente sera synchronisée dès que vous serez en ligne',
        icon: '/logos/icon-pwa.svg'
      });
      
      // Vider le panier
      setCart([]);
      setShowCartModal(false);
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde hors ligne:', error);
      showNotification('Erreur lors de la sauvegarde hors ligne', 'error');
    }
  };

  // Ajouter un indicateur de statut hors ligne dans l'interface
  const renderOfflineIndicator = () => {
    if (!isOnline) {
      return (
        <Alert 
          severity="warning" 
          sx={{ mb: 2 }}
          action={
            <Button size="small" color="inherit">
              Mode Hors Ligne
            </Button>
          }
        >
          Vous êtes actuellement hors ligne. Les ventes seront synchronisées ultérieurement.
        </Alert>
      );
    }
    return null;
  };

  // Ajouter un badge sur le bouton de validation
  const renderValidationButton = () => {
    const buttonText = isOnline 
      ? `✓ VALIDER LA VENTE (${calculerTotal()} F)`
      : `💾 SAUVEGARDER HORS LIGNE (${calculerTotal()} F)`;
    
    return (
      <Button
        variant="contained"
        fullWidth
        size="large"
        onClick={handleValidationVente}
        disabled={!clientSelectionne || cart.length === 0}
        sx={{
          bgcolor: isOnline ? 'primary.main' : 'warning.main',
          '&:hover': {
            bgcolor: isOnline ? 'primary.dark' : 'warning.dark'
          },
          fontWeight: 'bold',
          py: 2
        }}
      >
        {buttonText}
      </Button>
    );
  };

  // Dans votre return, ajouter l'indicateur hors ligne
  return (
    <Box>
      {/* Indicateur de statut hors ligne */}
      {renderOfflineIndicator()}
      
      {/* Votre contenu existant... */}
      
      {/* Remplacer votre bouton de validation existant par */}
      {renderValidationButton()}
      
      {/* Indicateur de ventes en attente */}
      {hasPendingSales && (
        <Alert 
          severity="info" 
          sx={{ mt: 2 }}
          action={
            <Button size="small" href="#offline-sales">
              Voir ({hasPendingSales.pendingCount})
            </Button>
          }
        >
          {hasPendingSales.pendingCount} vente(s) en attente de synchronisation
        </Alert>
      )}
    </Box>
  );
};

export default BoissonApp;
