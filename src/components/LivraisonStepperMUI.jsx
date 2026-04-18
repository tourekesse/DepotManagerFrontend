import * as React from 'react';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepButton from '@mui/material/StepButton';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import PropTypes from 'prop-types';

const steps = ['Récapitulatif', 'Saisie manuelle', 'Confirmation'];

export default function LivraisonStepperMUI({ vente, onClose, onValidate }) {
  const [activeStep, setActiveStep] = React.useState(0);
  const [completed, setCompleted] = React.useState({});
  const [manualValues, setManualValues] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(false);

  const totalSteps = () => steps.length;
  const completedSteps = () => Object.keys(completed).length;
  const isLastStep = () => activeStep === totalSteps() - 1;
  const allStepsCompleted = () => completedSteps() === totalSteps();

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };
  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };
  const handleStep = (step) => () => {
    setActiveStep(step);
  };
  const handleComplete = async () => {
    if (activeStep === 0) {
      // Valider "tous les vides rendus"
      setLoading(true);
      try {
        await onValidate({ venteId: vente.id, allReturned: true });
        setSuccess(true);
        setCompleted({ ...completed, [activeStep]: true });
        handleNext();
      } catch (e) {
        setError('Erreur lors de la validation');
      } finally {
        setLoading(false);
      }
    } else if (activeStep === 1) {
      // Saisie manuelle
      setLoading(true);
      try {
        await onValidate({ venteId: vente.id, allReturned: false, ...manualValues });
        setSuccess(true);
        setCompleted({ ...completed, [activeStep]: true });
        handleNext();
      } catch (e) {
        setError('Erreur lors de la validation');
      } finally {
        setLoading(false);
      }
    } else {
      setCompleted({ ...completed, [activeStep]: true });
      handleNext();
    }
  };
  const handleReset = () => {
    setActiveStep(0);
    setCompleted({});
    setManualValues({});
    setSuccess(false);
    setError(null);
  };

  return (
    <Box sx={{ width: '100%', p: 1 }}>
      {/* Rappel synthétique de la commande */}
      <Box sx={{ mb: 2, p: 1, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Client : <b>{vente.clientNom}</b> &nbsp;|&nbsp; Montant : <b>{vente.montantTotal} FCFA</b> &nbsp;|&nbsp; Date : <b>{vente.dateVente}</b>
        </Typography>
      </Box>
      <Stepper nonLinear activeStep={activeStep} sx={{ mb: 2 }}>
        {steps.map((label, index) => (
          <Step key={label} completed={completed[index]}>
            <StepButton color="inherit" onClick={handleStep(index)}>
              {label}
            </StepButton>
          </Step>
        ))}
      </Stepper>
      <div>
        {allStepsCompleted() ? (
          <React.Fragment>
            <Typography sx={{ mt: 2, mb: 1 }} color="success.main">
              Livraison validée !
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
              <Box sx={{ flex: '1 1 auto' }} />
              <Button onClick={onClose}>Fermer</Button>
              <Button onClick={handleReset} color="secondary">Nouvelle saisie</Button>
            </Box>
          </React.Fragment>
        ) : (
          <React.Fragment>
            {activeStep === 0 && (
              <Box>
                <Typography variant="h6">Livraison de la vente #{vente.id}</Typography>
                <Typography>Client : {vente.clientNom}</Typography>
                <Typography>Date : {vente.dateVente}</Typography>
                <Typography>Montant : {vente.montantTotal} FCFA</Typography>
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button variant="contained" onClick={handleComplete} disabled={loading}>Tous les vides rendus</Button>
                  <Button variant="outlined" onClick={handleNext}>Saisie manuelle</Button>
                </Box>
                {error && <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>}
              </Box>
            )}
            {activeStep === 1 && (
              <Box>
                <Typography variant="h6">Saisir les quantités livrées/rendues</Typography>
                <Box sx={{ my: 2 }}>
                  <label>Quantité livrée</label>
                  <input type="number" style={{ width: '100%', marginBottom: 8 }} value={manualValues.qteLivree || ''} onChange={e => setManualValues(v => ({ ...v, qteLivree: e.target.value }))} />
                  <label>Quantité vide rendue</label>
                  <input type="number" style={{ width: '100%' }} value={manualValues.qteVideRendue || ''} onChange={e => setManualValues(v => ({ ...v, qteVideRendue: e.target.value }))} />
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="contained" onClick={handleComplete} disabled={loading}>Valider</Button>
                  <Button variant="outlined" onClick={handleBack}>Retour</Button>
                </Box>
                {error && <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>}
              </Box>
            )}
            {activeStep === 2 && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                {success ? (
                  <>
                    <Typography color="success.main" variant="h6">Livraison validée !</Typography>
                    <Button onClick={onClose} sx={{ mt: 2 }}>Fermer</Button>
                  </>
                ) : (
                  <>
                    <Typography color="error" variant="h6">Erreur lors de la validation</Typography>
                    <Button onClick={onClose} sx={{ mt: 2 }}>Fermer</Button>
                  </>
                )}
              </Box>
            )}
          </React.Fragment>
        )}
      </div>
    </Box>
  );
}

LivraisonStepperMUI.propTypes = {
  vente: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onValidate: PropTypes.func.isRequired,
};
