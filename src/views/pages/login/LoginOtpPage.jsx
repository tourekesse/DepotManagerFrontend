import { useState } from "react";
import { publicApi } from "../../../api/axios";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "../../../context/UserContext";
import { getDefaultHomePageForRole } from "../../../config/roleConfig";
import { sendOTP, verifyOTP, resetRecaptcha } from "../../../utils/firebaseAuth";
import { getUserCountry } from "../../../config/countries";
import { formatPhoneDisplay, normalizePhoneInternational, validatePhone as validatePhoneUtil, getPhoneExample } from "../../../utils/phoneUtils";

import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Typography,
  Container,
  Grid,
  CircularProgress,
  InputAdornment,
  Chip,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import {
  Phone,
  Lock,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";

const steps = ["Téléphone", "Code OTP"];

export default function LoginOtpPage() {
  const userCountry = getUserCountry();
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isTestNumber, setIsTestNumber] = useState(false);

  const { login } = useUser();
  const navigate = useNavigate();

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 0) return "";
    const dialDigits = userCountry.dialCode.replace("+", "");
    const countryDigits = userCountry.phoneDigits;
    if (digits.length <= dialDigits.length) return `+${digits}`;
    const local = digits.slice(dialDigits.length);
    if (local.length === 0) return `+${dialDigits}`;
    const countryPart = local.slice(0, countryDigits);
    if (countryPart.length <= 2) return `+${dialDigits} ${countryPart}`;
    if (countryPart.length <= 4) return `+${dialDigits} ${countryPart.slice(0, 2)} ${countryPart.slice(2)}`;
    if (countryPart.length <= 6) return `+${dialDigits} ${countryPart.slice(0, 2)} ${countryPart.slice(2, 4)} ${countryPart.slice(4)}`;
    if (countryPart.length <= 8) return `+${dialDigits} ${countryPart.slice(0, 2)} ${countryPart.slice(2, 4)} ${countryPart.slice(4, 6)} ${countryPart.slice(6)}`;
    return `+${dialDigits} ${countryPart.slice(0, 2)} ${countryPart.slice(2, 4)} ${countryPart.slice(4, 6)} ${countryPart.slice(6, 8)} ${countryPart.slice(8, countryDigits)}`;
  };

  const normalizePhone = (value) => {
    return normalizePhoneInternational(value, userCountry.code);
  };

  const validatePhone = (phoneValue) => {
    if (!validatePhoneUtil(phoneValue, userCountry.code)) {
      setPhoneError(`Numéro de téléphone incomplet (${userCountry.phoneDigits} chiffres requis)`);
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    setPhoneError("");
    setMessage({ type: "", text: "" });
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!validatePhone(phone)) return;

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const normalizedPhone = normalizePhone(phone);
      const result = await sendOTP(normalizedPhone);

      if (result.success) {
        setIsTestNumber(result.isTestNumber || false);
        setStep(1);
        setMessage({
          type: "success",
          text: result.isTestNumber
            ? "Mode test activé ! Utilisez le code: 123456"
            : "Code OTP envoyé par SMS",
        });
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors de l'envoi du code" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setOtpError("Le code doit contenir 6 chiffres");
      return;
    }

    setLoading(true);
    setOtpError("");
    setMessage({ type: "", text: "" });

    try {
      const result = await verifyOTP(otp);

      if (result.success) {
        setMessage({ type: "success", text: "Vérification réussie..." });

        const loginRes = await publicApi.post(
          "/api/auth/firebase-phone-login",
          { idToken: result.idToken },
          { withCredentials: true }
        );

        if (loginRes.data.success) {
          const apiResponse = loginRes.data;
          localStorage.setItem("token", apiResponse.token);
          if (apiResponse.clientId) {
            localStorage.setItem("clientId", apiResponse.clientId);
          }

          const mappedUser = {
            ...apiResponse,
            pointDeVenteActifId:
              apiResponse.pointDeVenteActif?.id ??
              apiResponse.defaultPointDeVenteId,
          };

          localStorage.setItem("dmUser", JSON.stringify(mappedUser));
          login(mappedUser);

          if (apiResponse.passwordMustChange) {
            navigate("/change-password");
            return;
          }

          if (!apiResponse.onboardingCompleted) {
            navigate("/setup/wizard");
            return;
          }

          navigate(getDefaultHomePageForRole(apiResponse.role));
          return;
        }

        setMessage({ type: "error", text: loginRes.data.message || "Erreur de connexion" });
      } else {
        setOtpError(result.message);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setMessage({
          type: "warning",
          text: "Ce numéro n'est pas lié à un compte. Créez un compte d'abord.",
        });
      } else {
        setMessage({ type: "error", text: error.response?.data?.message || "Erreur de vérification" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    resetRecaptcha();
    setOtp("");
    setStep(0);
    setMessage({ type: "", text: "" });
  };

  const handleBack = () => {
    resetRecaptcha();
    setStep(0);
    setOtp("");
    setOtpError("");
    setMessage({ type: "", text: "" });
    setIsTestNumber(false);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        py: { xs: 4, md: 0 },
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={6} alignItems="center">
          <Grid
            item
            xs={12}
            md={6}
            sx={{ display: { xs: "none", md: "block" } }}
          >
            <Box sx={{ p: 4 }}>
              <Box
                component="img"
                src="/logo.svg"
                alt="DepotManager Logo"
                sx={{ width: 80, height: 80, mb: 4 }}
              />
              <Typography
                variant="h3"
                sx={{ fontWeight: 800, color: "#6A1B9A", mb: 3, lineHeight: 1.2 }}
              >
                Connexion rapide par téléphone
              </Typography>
              <Typography variant="h6" sx={{ color: "#616161", fontWeight: 400, mb: 4 }}>
                Recevez un code par SMS et connectez-vous en quelques secondes.
              </Typography>

              <Box sx={{ mt: 6 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: "#f3e5f5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MessageSquare size={24} color="#6A1B9A" />
                  </Box>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: "#1a1a2e" }}>
                      SMS instantané
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Code reçu en quelques secondes
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: "#f3e5f5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ShieldCheck size={24} color="#6A1B9A" />
                  </Box>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: "#1a1a2e" }}>
                      Sûr et sécurisé
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Protégé par Firebase Authentication
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              sx={{
                maxWidth: 480,
                mx: "auto",
                borderRadius: 3,
                border: "1px solid #e0e0e0",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ textAlign: "center", mb: 3 }}>
                  <Box
                    component="img"
                    src="/logo.svg"
                    alt="DepotManager Logo"
                    sx={{ width: 64, height: 64, mb: 2 }}
                  />
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "#1a1a2e", mb: 1 }}
                  >
                    Connexion OTP
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {step === 0 ? "Entrez votre numéro de téléphone" : "Entrez le code reçu"}
                  </Typography>
                </Box>

                <Stepper activeStep={step} sx={{ mb: 4 }}>
                  {steps.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>

                {message.text && (
                  <Alert
                    severity={message.type}
                    sx={{ mb: 3 }}
                    onClose={() => setMessage({ type: "", text: "" })}
                  >
                    {message.text}
                  </Alert>
                )}

                {step === 0 && (
                  <form onSubmit={handleSendOTP}>
                    <TextField
                      label="Numéro de téléphone"
                      type="tel"
                      fullWidth
                      required
                      value={phone}
                      onChange={handlePhoneChange}
                      disabled={loading}
                      error={!!phoneError}
                      helperText={phoneError || `Ex: ${getPhoneExample(userCountry.code)}`}
                      sx={{ mb: 3 }}
                      inputProps={{ maxLength: 20 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Phone size={20} color="#6A1B9A" />
                          </InputAdornment>
                        ),
                      }}
                      placeholder={getPhoneExample(userCountry.code)}
                    />

                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      size="large"
                      disabled={loading || !phone}
                      endIcon={
                        loading ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          <ChevronRight size={20} />
                        )
                      }
                      sx={{
                        bgcolor: "#6A1B9A",
                        py: 1.5,
                        fontWeight: 700,
                        "&:hover": { bgcolor: "#7E57C2" },
                      }}
                    >
                      {loading ? "Envoi en cours..." : "Recevoir le code"}
                    </Button>
                  </form>
                )}

                {step === 1 && (
                  <form onSubmit={handleVerifyOTP}>
                    <TextField
                      label="Code OTP (6 chiffres)"
                      type="text"
                      fullWidth
                      required
                      value={otp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setOtp(val);
                        setOtpError("");
                      }}
                      disabled={loading}
                      error={!!otpError}
                      helperText={otpError || (isTestNumber ? "Mode test: utilisez 123456" : "")}
                      sx={{ mb: 3 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock size={20} color="#6A1B9A" />
                          </InputAdornment>
                        ),
                      }}
                      placeholder="123456"
                    />

                    <Box sx={{ display: "flex", gap: 2 }}>
                      <Button
                        variant="outlined"
                        size="large"
                        onClick={handleBack}
                        disabled={loading}
                        startIcon={<ChevronLeft size={20} />}
                        sx={{
                          flex: 1,
                          py: 1.5,
                          borderColor: "#6A1B9A",
                          color: "#6A1B9A",
                          "&:hover": {
                            borderColor: "#7E57C2",
                            bgcolor: "#f3e5f5",
                          },
                        }}
                      >
                        Retour
                      </Button>
                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={loading || otp.length !== 6}
                        endIcon={
                          loading ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : (
                            <ChevronRight size={20} />
                          )
                        }
                        sx={{
                          flex: 1,
                          bgcolor: "#6A1B9A",
                          py: 1.5,
                          fontWeight: 700,
                          "&:hover": { bgcolor: "#7E57C2" },
                        }}
                      >
                        {loading ? "Vérification..." : "Vérifier"}
                      </Button>
                    </Box>

                    <Box sx={{ mt: 3, textAlign: "center" }}>
                      <Typography variant="body2" color="text.secondary">
                        Pas reçu le code ?{" "}
                        <Button
                          variant="text"
                          size="small"
                          onClick={handleResendOTP}
                          sx={{ color: "#6A1B9A", fontWeight: 600 }}
                        >
                          Renvoyer
                        </Button>
                      </Typography>
                    </Box>
                  </form>
                )}

                <Box sx={{ mt: 3, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    Préférez l'email/password ?{" "}
                    <Link
                      to="/login"
                      style={{
                        color: "#6A1B9A",
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      Se connecter autrement
                    </Link>
                  </Typography>
                </Box>

                <Box
                  sx={{
                    mt: 3,
                    pt: 3,
                    borderTop: "1px solid #e0e0e0",
                    textAlign: "center",
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Pas encore de compte ?{" "}
                    <Link
                      to="/essai"
                      style={{
                        color: "#6A1B9A",
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      Essai gratuit 14 jours
                    </Link>
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
      <div id="recaptcha-container" style={{ display: "none" }} />
    </Box>
  );
}
