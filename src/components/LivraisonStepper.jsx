import React, { useRef, useState } from 'react';
import { Stepper } from 'primereact/stepper';
import { StepperPanel } from 'primereact/stepperpanel';
import { Button } from 'primereact/button';
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { formatCurrency } from '../utils/currencyUtils';

// Ce composant regroupe le workflow de validation de livraison en 3 étapes :
// 1. Récapitulatif, 2. Saisie manuelle (si besoin), 3. Confirmation

const LivraisonStepper = ({ vente, onClose, onValidate }) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const stepperRef = useRef(null);
    const [manualEntry, setManualEntry] = useState(false);
    const [manualValues, setManualValues] = useState({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    // Étape 1 : Récapitulatif
    const handleAllReturned = () => {
        setLoading(true);
        // Appel API pour valider la livraison complète
        onValidate({ venteId: vente.id, allReturned: true })
            .then(() => {
                setSuccess(true);
                stepperRef.current.nextCallback();
            })
            .catch((e) => {
                setError('Erreur lors de la validation');
            })
            .finally(() => setLoading(false));
    };

    // Étape 2 : Saisie manuelle
    const handleManualSubmit = () => {
        setLoading(true);
        // Appel API pour valider la livraison partielle
        onValidate({ venteId: vente.id, allReturned: false, ...manualValues })
            .then(() => {
                setSuccess(true);
                stepperRef.current.nextCallback();
            })
            .catch((e) => {
                setError('Erreur lors de la validation');
            })
            .finally(() => setLoading(false));
    };

    // Étape 3 : Confirmation
    const handleFinish = () => {
        onClose();
    };

    return (
        <Dialog
            open={!!vente}
            onClose={onClose}
            fullScreen={fullScreen}
            maxWidth="xs"
            fullWidth
            PaperProps={{ style: { borderRadius: fullScreen ? 0 : 16, minWidth: fullScreen ? undefined : 340 } }}
        >
            <DialogTitle sx={{ p: 2, pb: 0, fontWeight: 600, fontSize: 18 }}>
                Validation de livraison
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 0, pt: 1 }}>
                <div style={{ minWidth: fullScreen ? undefined : 320, padding: 8 }}>
                    <Stepper ref={stepperRef} style={{ flexBasis: '100%' }} linear>
                        {/* Étape 1 : Récapitulatif */}
                        <StepperPanel header="Récapitulatif">
                            <div className="p-3">
                                <h3>Livraison de la vente #{vente.id}</h3>
                                {/* Afficher le récapitulatif de la vente ici */}
                                <div>Client : {vente.clientNom}</div>
                                <div>Date : {vente.dateVente}</div>
                                <div>Montant : {formatCurrency(vente.montantTotal)}</div>
                                {/* ...autres infos */}
                                <div className="flex gap-2 mt-4">
                                    <Button label="Tous les vides rendus" icon="pi pi-check" loading={loading} onClick={handleAllReturned} />
                                    <Button label="Saisie manuelle" icon="pi pi-pencil" severity="secondary" onClick={() => { setManualEntry(true); stepperRef.current.nextCallback(); }} />
                                </div>
                                {error && <div className="text-danger mt-2">{error}</div>}
                            </div>
                        </StepperPanel>
                        {/* Étape 2 : Saisie manuelle */}
                        <StepperPanel header="Saisie manuelle">
                            <div className="p-3">
                                <h4>Saisir les quantités livrées/rendues</h4>
                                {/* Exemple de champs, à adapter selon le modèle */}
                                <div className="mb-2">
                                    <label>Quantité livrée</label>
                                    <input type="number" className="p-inputtext" value={manualValues.qteLivree || ''} onChange={e => setManualValues(v => ({ ...v, qteLivree: e.target.value }))} />
                                </div>
                                <div className="mb-2">
                                    <label>Quantité vide rendue</label>
                                    <input type="number" className="p-inputtext" value={manualValues.qteVideRendue || ''} onChange={e => setManualValues(v => ({ ...v, qteVideRendue: e.target.value }))} />
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <Button label="Valider" icon="pi pi-check" loading={loading} onClick={handleManualSubmit} />
                                    <Button label="Retour" icon="pi pi-arrow-left" severity="secondary" onClick={() => stepperRef.current.prevCallback()} />
                                </div>
                                {error && <div className="text-danger mt-2">{error}</div>}
                            </div>
                        </StepperPanel>
                        {/* Étape 3 : Confirmation */}
                        <StepperPanel header="Confirmation">
                            <div className="p-3 flex flex-column align-items-center">
                                {success ? (
                                    <>
                                        <i className="pi pi-check-circle text-success" style={{ fontSize: 48 }}></i>
                                        <h4>Livraison validée !</h4>
                                        <Button label="Fermer" className="mt-3" onClick={handleFinish} />
                                    </>
                                ) : (
                                    <>
                                        <i className="pi pi-times-circle text-danger" style={{ fontSize: 48 }}></i>
                                        <h4>Erreur lors de la validation</h4>
                                        <Button label="Fermer" className="mt-3" onClick={handleFinish} />
                                    </>
                                )}
                            </div>
                        </StepperPanel>
                    </Stepper>
                </div>
            </DialogContent>
        </Dialog>
    );
};

LivraisonStepper.propTypes = {
    vente: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onValidate: PropTypes.func.isRequired,
};

export default LivraisonStepper;
