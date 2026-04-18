// EXEMPLE D'INTÉGRATION DU SYSTÈME OTP DANS LivraisonList.jsx
// À ajouter dans votre fichier existant

import LivraisonOtpModal from '../../../components/LivraisonOtpModal';

// 1. Ajouter les états
const [otpModalOpen, setOtpModalOpen] = useState(false);
const [venteEnCoursValidation, setVenteEnCoursValidation] = useState(null);

// 2. Modifier handleStepperValidate pour intégrer l'OTP
const handleStepperValidate = async (payload) => {
  try {
    const vente = selectedVente;
    const modeLivraison = vente?.modeLivraison || vente?.mode_livraison;
    
    // Pour les livraisons uniquement
    if (modeLivraison === 'A_LIVRER') {
      // Ouvrir le modal OTP
      setVenteEnCoursValidation({ ...vente, payload });
      setOtpModalOpen(true);
      return; // Attendre la validation OTP
    }
    
    // Pour les ventes sur place (pas d'OTP)
    if (modeLivraison === 'SUR_PLACE') {
      // Validation directe
      await privateApi.post(`/api/ventes/${payload.venteId}/dispatcher`, {
        casiersRendus: payload.casiersRendus || 0,
        bouteillesRendues: payload.bouteillesRendues || 0,
        montantPaye: payload.montantPaye || 0
      });
      await loadData();
      notifications.show('✅ Vente sur place terminée !', { severity: 'success' });
    }
    
  } catch (err) {
    console.error('Erreur validation:', err);
    notifications.show(err.message, { severity: 'error' });
  }
};

// 3. Callback après validation OTP réussie
const handleOtpValidationSuccess = async () => {
  try {
    setOtpModalOpen(false);
    
    const { payload } = venteEnCoursValidation;
    
    // Maintenant que l'OTP est validé, on peut dispatcher
    await privateApi.post(`/api/ventes/${payload.venteId}/dispatcher`, {
      casiersRendus: payload.casiersRendus || 0,
      bouteillesRendues: payload.bouteillesRendues || 0,
      montantPaye: payload.montantPaye || 0
    });
    
    await loadData();
    handleStepperClose();
    
    notifications.show('🎉 Livraison validée avec succès !', { 
      severity: 'success',
      autoHideDuration: 5000
    });
    
  } catch (err) {
    console.error('Erreur après validation OTP:', err);
    notifications.show('Erreur: ' + err.message, { severity: 'error' });
  }
};

// 4. Ajouter le modal dans le JSX (à la fin, après les autres modals)
return (
  <>
    {/* ... Votre code existant ... */}
    
    <LivraisonStepperModal
      open={stepperOpen}
      onClose={handleStepperClose}
      vente={selectedVente}
      onValidate={handleStepperValidate}
    />
    
    {/* NOUVEAU: Modal OTP */}
    <LivraisonOtpModal
      open={otpModalOpen}
      onClose={() => {
        setOtpModalOpen(false);
        setVenteEnCoursValidation(null);
      }}
      vente={venteEnCoursValidation}
      onValidationSuccess={handleOtpValidationSuccess}
    />
  </>
);
