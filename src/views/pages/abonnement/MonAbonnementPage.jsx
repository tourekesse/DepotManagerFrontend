import * as React from "react";
import {
  Box, Button, Card, CardContent, Typography, TextField, Alert,
  CircularProgress, Chip, Stack, Dialog, DialogTitle, DialogContent,
  DialogActions, Paper, Divider, Radio, RadioGroup, FormControlLabel
} from "@mui/material";
import { InputMask } from 'primereact/inputmask';
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import SettingsIcon from "@mui/icons-material/Settings";
import AddIcon from "@mui/icons-material/Add";
import PageContainer from "../../../crud-dashboard/components/PageContainer";
import useNotifications from "../../../crud-dashboard/hooks/useNotifications/useNotifications";
import { publicApi } from "../../../api/axios";

// --- UTILS ---
const formatF = (n) => {
  if (n === null || n === undefined) return "0 F";
  const num = typeof n === "string" ? parseFloat(n) : n;
  return isNaN(num) ? "0 F" : num.toLocaleString("fr-CI") + " F";
};

// FONCTION CLÉ : Récupère uniquement les 10 chiffres de droite
const getLocalTenDigits = (phone) => {
  if (!phone) return "";
  const digits = phone.toString().replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

const formatDate = (dateValue) => {
  if (!dateValue) return "-";
  
  // Si c'est un tableau [année, mois, jour] venant de Java LocalDate
  if (Array.isArray(dateValue) && dateValue.length >= 3) {
    const [year, month, day] = dateValue;
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }
  
  // Si c'est une string ISO
  if (typeof dateValue === 'string') {
    const d = new Date(dateValue);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("fr-CI", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
  }
  
  return "-";
};

const daysUntil = (dateValue) => {
  if (!dateValue) return 0;
  
  let end;
  // Si c'est un tableau [année, mois, jour] venant de Java LocalDate
  if (Array.isArray(dateValue) && dateValue.length >= 3) {
    const [year, month, day] = dateValue;
    end = new Date(year, month - 1, day); // month - 1 car JS commence à 0
  } else {
    end = new Date(dateValue);
  }
  
  const today = new Date();
  return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
};

const getStatusColor = (statut) => {
  switch (statut) {
    case "ACTIF": return "success";
    case "EN_COURS": return "warning";
    case "EN_ATTENTE": return "info";
    case "ANNULE": return "error";
    default: return "default";
  }
};

const getStatusLabel = (statut) => {
  switch (statut) {
    case "ACTIF": return "Actif";
    case "EN_COURS": return "En cours";
    case "EN_ATTENTE": return "En attente";
    case "ANNULE": return "Annulé";
    default: return statut;
  }
};

const getTypeLabel = (type) => {
  const mapping = { "BAR": "Bar", "MAQUIS": "Maquis", "SOUS_DEPOT": "Sous-dépôt" };
  return mapping[type] || type;
};

const getTypeIcon = (type) => {
  if (type === "BAR") return "🍺";
  if (type === "MAQUIS") return "🎵";
  if (type === "SOUS_DEPOT") return "📦";
  return "📋";
};

export default function MonAbonnementPage() {
  const notifications = useNotifications();
  const [abonnements, setAbonnements] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showRenewForm, setShowRenewForm] = React.useState(false);
  const [selectedAbonnement, setSelectedAbonnement] = React.useState(null);
  
  // État 'telephone' : stocke UNIQUEMENT les 10 chiffres (ex: 7080404050)
  const [telephone, setTelephone] = React.useState(""); 
  const [userSavedPhone, setUserSavedPhone] = React.useState(""); 

  const [payLoading, setPayLoading] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [openSuccess, setOpenSuccess] = React.useState(false);
  const [periode, setPeriode] = React.useState("annuel");
  const [tarif, setTarif] = React.useState(null);
  const [typeEtablissement, setTypeEtablissement] = React.useState(null);

  const clientId = localStorage.getItem("clientId");
  const user = JSON.parse(localStorage.getItem("dmUser") || "{}");

  // Charger les infos de l'utilisateur au montage
  React.useEffect(() => {
    const initData = async () => {
      setLoading(true);
      const userId = user?.userId || user?.id;
      
      // Récupérer le type d'établissement depuis le point de vente actif
      const pvId = user?.pointDeVenteActifId || user?.defaultPointDeVenteId;
      if (pvId) {
        try {
          const typeRes = await publicApi.get(`/api/points-vente/${pvId}/type-etablissement`);
          const typeEtab = typeRes.data?.typeEtablissement;
          setTypeEtablissement(typeEtab);
          
          // Mettre à jour dmUser dans localStorage avec typeEtablissement
          const updatedUser = { ...user, typeEtablissement: typeEtab };
          localStorage.setItem("dmUser", JSON.stringify(updatedUser));
        } catch (e) { console.error("Erreur fetch typeEtablissement", e); }
      }
      
      if (userId) {
        try {
          const res = await publicApi.get(`/api/users/${userId}`);
          if (res.data?.phoneNumber) {
            const clean = getLocalTenDigits(res.data.phoneNumber);
            setUserSavedPhone(clean);
            setTelephone("+225" + clean);
          }
        } catch (e) { console.error("Erreur fetch user", e); }
      }
      await loadAbonnements();
      setLoading(false);
    };
    initData();
  }, []);

  const loadAbonnements = async () => {
    let currentClientId = clientId;
    const userId = user?.id || user?.userId;
    
    if (!currentClientId && userId) {
      try {
        const clientRes = await publicApi.get(`/api/clients/utilisateur/${userId}`);
        if (clientRes.data?.id) currentClientId = clientRes.data.id;
      } catch (e) {}
    }
    
    if (!currentClientId) return;
    
    try {
      const res = await publicApi.get(`/api/abonnements/client/${currentClientId}`);
      console.log("Abonnement retourné:", res.data);
      if (res.data && !res.data.message) {
        setAbonnements([res.data]);
        loadTarif(res.data.type);
      }
    } catch (err) { setAbonnements([]); }
  };

  const loadTarif = async (type) => {
    try {
      const res = await publicApi.get(`/api/abonnements/tarif/${type}`);
      if (res.data) setTarif(res.data);
    } catch (err) {}
  };

  const handleRenewClick = async (abonnement) => {
    setSelectedAbonnement(abonnement);
    setResult(null);
    await loadTarif(abonnement.type);
    // On nettoie le téléphone de l'abonnement s'il existe, sinon celui de l'user
    const phoneToSet = getLocalTenDigits(abonnement.telephonePaiement) || userSavedPhone;
    setTelephone("+225" + phoneToSet);
    setShowRenewForm(true);
  };

  const handleSubscribeNew = async () => {
    setSelectedAbonnement(null);
    setResult(null);
    // Utiliser typeEtablissement pour déterminer le type d'abonnement
    const typeFromEtab = typeEtablissement === "SOUS_DEPOT" ? "SOUS_DEPOT" :
                         typeEtablissement === "BAR" ? "BAR" : "MAQUIS";
    await loadTarif(typeFromEtab);
    setTelephone("+225" + userSavedPhone);
    setShowRenewForm(true);
  };

  const handleSubscribe = async () => {
    // Extraction des chiffres du numéro masqué
    const digits = telephone.replace(/\D/g, "").replace(/^225/, "");
    if (digits.length < 10) {
      notifications.show("Numéro incomplet (10 chiffres requis)", { severity: "error" });
      return;
    }

    // Reconstruction du format international 225XXXXXXXXXX pour la DB
    const finalPhone = `225${digits}`;
    const userId = user?.id || user?.userId;
    let currentClientId = clientId;
    
    setPayLoading(true);
    try {
      if (!currentClientId && userId) {
        const clientRes = await publicApi.get(`/api/clients/utilisateur/${userId}`);
        currentClientId = clientRes.data?.id;
      }

      // Déterminer le type - pour nouveau abonnement, utiliser typeEtablissement
      const typeFromEtab = typeEtablissement === "SOUS_DEPOT" ? "SOUS_DEPOT" :
                           typeEtablissement === "BAR" ? "BAR" : "MAQUIS";
      const type = selectedAbonnement?.type || typeFromEtab;
      const isRenewal = selectedAbonnement?.statut === "ACTIF";
      
      const payload = { 
        clientId: parseInt(currentClientId), 
        type: type, 
        telephone: finalPhone, 
        periode: periode 
      };

      const endpoint = isRenewal ? "/api/abonnements/renouveler" : "/api/abonnements/payer";
      const res = await publicApi.post(endpoint, payload);
      
      if (res.data.success) {
        setOpenSuccess(true);
      } else {
        notifications.show(res.data.message || "Échec du paiement", { severity: "error" });
      }
    } catch (err) {
      notifications.show("Erreur de connexion au service", { severity: "error" });
    } finally { setPayLoading(false); }
  };

  if (loading) {
    return (
      <PageContainer title="Mon Abonnement">
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress /></Box>
      </PageContainer>
    );
  }

  if (showRenewForm) {
    const details = tarif ? (periode === "annuel" ? { montant: tarif.prixAnnuel } : { montant: tarif.prixMensuel }) : { montant: 0 };

    return (
      <PageContainer title={selectedAbonnement ? "Renouveler" : "Nouvel abonnement"}>
        <Box sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          py: 4
        }}>
          <Box sx={{ maxWidth: 800, mx: "auto", px: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setShowRenewForm(false)}
              sx={{
                mb: 3,
                color: 'white',
                borderColor: 'rgba(255,255,255,0.3)',
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
              }}
            >
              ← Retour
            </Button>

            <Card sx={{
              borderRadius: 4,
              boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)'
            }}>
              <Box sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                p: 4,
                color: 'white',
                textAlign: 'center'
              }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                  {selectedAbonnement ? "Renouveler votre abonnement" : "Souscrire à un abonnement"}
                </Typography>
                <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                  {selectedAbonnement ? "Prolongez votre accès aux fonctionnalités premium" : "Accédez à toutes les fonctionnalités de DepotManager"}
                </Typography>
              </Box>

              <CardContent sx={{ p: 4 }}>
                {selectedAbonnement && (
                  <Alert
                    severity="info"
                    sx={{
                      mb: 3,
                      borderRadius: 2,
                      bgcolor: '#e3f2fd',
                      color: '#1565c0'
                    }}
                    icon={<AccessTimeIcon />}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Renouvellement de l'abonnement {getTypeLabel(selectedAbonnement.type)}
                    </Typography>
                    <Typography variant="body2">
                      Expire le {formatDate(selectedAbonnement.dateFin)}
                    </Typography>
                  </Alert>
                )}

                {tarif && (
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: '#333' }}>
                      Choisissez votre formule
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <Paper
                        onClick={() => setPeriode("mensuel")}
                        sx={{
                          p: 3,
                          borderRadius: 3,
                          cursor: 'pointer',
                          border: periode === "mensuel" ? "3px solid #667eea" : "2px solid #e0e0e0",
                          bgcolor: periode === "mensuel" ? "#f8f9ff" : "white",
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: "0 8px 25px rgba(0,0,0,0.1)"
                          },
                          flex: 1
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                          <Box sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            bgcolor: '#e3f2fd',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <SmartphoneIcon sx={{ color: '#1976d2' }} />
                          </Box>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#333' }}>
                              Mensuel
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Flexibilité maximale
                            </Typography>
                          </Box>
                        </Stack>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: '#667eea', mb: 1 }}>
                          {formatF(tarif.prixMensuel)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          par mois
                        </Typography>
                      </Paper>

                      <Paper
                        onClick={() => setPeriode("annuel")}
                        sx={{
                          p: 3,
                          borderRadius: 3,
                          cursor: 'pointer',
                          border: periode === "annuel" ? "3px solid #764ba2" : "2px solid #e0e0e0",
                          bgcolor: periode === "annuel" ? "#f8f5ff" : "white",
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: "0 8px 25px rgba(0,0,0,0.1)"
                          },
                          flex: 1
                        }}
                      >
                        <Box sx={{
                          position: 'absolute',
                          top: -10,
                          right: -10,
                          bgcolor: '#ff6b35',
                          color: 'white',
                          px: 2,
                          py: 0.5,
                          borderRadius: 2,
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>
                          ÉCONOMIE 17%
                        </Box>
                        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                          <Box sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            bgcolor: '#f3e5f5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <SettingsIcon sx={{ color: '#7b1fa2' }} />
                          </Box>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#333' }}>
                              Annuel
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              2 mois gratuits
                            </Typography>
                          </Box>
                        </Stack>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: '#764ba2', mb: 1 }}>
                          {formatF(tarif.prixAnnuel)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          par an
                        </Typography>
                      </Paper>
                    </Stack>
                  </Box>
                )}

                <Divider sx={{ my: 4 }} />

                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: '#333' }}>
                    Informations de paiement
                  </Typography>
                  <Paper sx={{
                    p: 3,
                    borderRadius: 3,
                    bgcolor: '#f8f9fa',
                    border: '1px solid #e9ecef'
                  }}>
                    <Stack direction="row" alignItems="center" spacing={3}>
                      <Box sx={{
                        width: 60,
                        height: 60,
                        borderRadius: 2,
                        bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}>
                        <SmartphoneIcon sx={{ fontSize: 30 }} />
                      </Box>
                      <Box flex={1}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#333', mb: 1 }}>
                          Mobile Money - Côte d'Ivoire
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Orange Money, MTN Mobile Money, Moov Money
                        </Typography>
                        <InputMask
                          mask="+225 99 99 99 99 99"
                          value={telephone}
                          onChange={(e) => setTelephone(e.value)}
                          placeholder="07 00 00 00 00"
                          style={{
                            width: '100%',
                            padding: '14px 16px',
                            fontSize: '1rem',
                            border: '2px solid #e0e0e0',
                            borderRadius: '8px',
                            backgroundColor: 'white',
                            outline: 'none',
                            transition: 'border-color 0.3s ease',
                            '&:focus': {
                              borderColor: '#667eea'
                            }
                          }}
                        />
                      </Box>
                    </Stack>
                  </Paper>
                </Box>

                <Paper sx={{
                  p: 3,
                  borderRadius: 3,
                  bgcolor: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                  mb: 4
                }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#333' }}>
                        Total à payer
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {periode === "annuel" ? "14 mois" : "1 mois"} - {getTypeLabel(tarif?.type)}
                      </Typography>
                    </Box>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: '#667eea' }}>
                      {formatF(details.montant)}
                    </Typography>
                  </Stack>
                </Paper>

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleSubscribe}
                  disabled={payLoading || telephone.replace(/\D/g, "").replace(/^225/, "").length < 10}
                  sx={{
                    py: 2,
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  {payLoading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    <>
                      <SmartphoneIcon sx={{ mr: 1 }} />
                      Payer maintenant - {formatF(details.montant)}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </Box>
        </Box>

        <Dialog open={openSuccess} onClose={() => setOpenSuccess(false)}>
            <DialogContent sx={{ textAlign: 'center', p: 4 }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 70, mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>Paiement lancé !</Typography>
                <Typography sx={{ mt: 1 }}>Validez la demande sur votre téléphone : <br/><b>{telephone}</b></Typography>
                <Button variant="contained" fullWidth sx={{ mt: 4 }} onClick={() => { setOpenSuccess(false); setShowRenewForm(false); loadAbonnements(); }}>J'ai compris</Button>
            </DialogContent>
        </Dialog>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Mes Abonnements">
      <Box sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        py: 4
      }}>
        <Box sx={{ maxWidth: 1000, mx: "auto", px: 2 }}>
          <Box sx={{
            background: 'white',
            borderRadius: 4,
            p: 4,
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            mb: 4
          }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#333', mb: 1 }}>
                  Mes Abonnements
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Gérez vos services et renouvellements
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleSubscribeNew}
                sx={{
                  borderRadius: 3,
                  px: 4,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                Nouvel abonnement
              </Button>
            </Stack>

            {abonnements.length === 0 ? (
              <Card sx={{
                p: 6,
                textAlign: 'center',
                borderRadius: 3,
                bgcolor: '#f8f9fa',
                border: '2px dashed #e9ecef'
              }}>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: '#e9ecef',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3
                  }}>
                    <AddIcon sx={{ fontSize: 40, color: '#6c757d' }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#495057', mb: 1 }}>
                    Aucun abonnement actif
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Souscrivez à un abonnement pour accéder à toutes les fonctionnalités premium
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleSubscribeNew}
                    sx={{
                      borderRadius: 3,
                      px: 4,
                      py: 1.5,
                      borderColor: '#667eea',
                      color: '#667eea',
                      '&:hover': {
                        borderColor: '#5a6fd8',
                        bgcolor: '#f8f9ff'
                      }
                    }}
                  >
                    Commencer maintenant
                  </Button>
                </Box>
              </Card>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 3 }}>
                {abonnements.map(abo => {
                  const daysLeft = daysUntil(abo.dateFin);
                  const isExpired = daysLeft < 0;
                  const isExpiringSoon = daysLeft >= 0 && daysLeft <= 7;

                  return (
                    <Card key={abo.id} sx={{
                      borderRadius: 3,
                      overflow: 'hidden',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 35px rgba(0,0,0,0.15)'
                      },
                      border: isExpiringSoon ? '2px solid #ff9800' : '1px solid #e9ecef',
                      position: 'relative'
                    }}>
                      {isExpiringSoon && (
                        <Box sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bgcolor: '#ff9800',
                          color: 'white',
                          px: 2,
                          py: 0.5,
                          textAlign: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          Expiration imminente
                        </Box>
                      )}

                      <CardContent sx={{ p: 4 }}>
                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 3 }}>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Box sx={{
                              width: 60,
                              height: 60,
                              borderRadius: 2,
                              bgcolor: abo.type === "BAR" ? "#e3f2fd" : abo.type === "MAQUIS" ? "#f3e5f5" : "#fff3e0",
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Typography variant="h4">
                                {getTypeIcon(abo.type)}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="h5" sx={{ fontWeight: 700, color: '#333' }}>
                                {getTypeLabel(abo.type)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Abonnement actif
                              </Typography>
                            </Box>
                          </Stack>

                          <Chip
                            label={getStatusLabel(abo.statut)}
                            color={getStatusColor(abo.statut)}
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              px: 2
                            }}
                          />
                        </Stack>

                        <Divider sx={{ my: 3 }} />

                        <Stack spacing={2} sx={{ mb: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <AccessTimeIcon sx={{ color: '#6c757d' }} />
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Date d'expiration
                              </Typography>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {formatDate(abo.dateFin)}
                              </Typography>
                            </Box>
                          </Box>

                          {isExpired ? (
                            <Alert severity="error" sx={{ borderRadius: 2 }}>
                              <Typography variant="body2">
                                Expiré depuis {Math.abs(daysLeft)} jours
                              </Typography>
                            </Alert>
                          ) : isExpiringSoon ? (
                            <Alert severity="warning" sx={{ borderRadius: 2 }}>
                              <Typography variant="body2">
                                Expire dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}
                              </Typography>
                            </Alert>
                          ) : (
                            <Alert severity="success" sx={{ borderRadius: 2 }}>
                              <Typography variant="body2">
                                {daysLeft} jours restants
                              </Typography>
                            </Alert>
                          )}
                        </Stack>

                        <Stack direction="row" spacing={2}>
                          {daysLeft <= 15 && (
                            <Button
                              variant="outlined"
                              fullWidth
                              onClick={() => handleRenewClick(abo)}
                              startIcon={<SettingsIcon />}
                              sx={{
                                borderRadius: 2,
                                py: 1.5,
                                fontWeight: 600,
                                borderColor: '#667eea',
                                color: '#667eea',
                                '&:hover': {
                                  borderColor: '#5a6fd8',
                                  bgcolor: '#f8f9ff'
                                }
                              }}
                            >
                              Renouveler
                            </Button>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </PageContainer>
  );
}