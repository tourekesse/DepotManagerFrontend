// 🔐 Firebase Phone Authentication Service (OTP)
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBjycsXSf68phnC9NpH968cvh633cACSJk",
  authDomain: "depotmanager-51482.firebaseapp.com",
  projectId: "depotmanager-51482",
  storageBucket: "depotmanager-51482.firebasestorage.app",
  messagingSenderId: "516353481225",
  appId: "1:516353481225:web:741c9a63603eb761e236d8",
  measurementId: "G-2EYWRZXRT3"
};

// Initialize Firebase Auth
let auth;
if (!getApps().length) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} else {
  auth = getAuth(getApps()[0]);
}

// Configuration du reCAPTCHA
let confirmationResult = null;
let recaptchaVerifier = null;

/**
 * Initialise le reCAPTCHA invisible
 */
export function initRecaptcha(containerId = 'recaptcha-container') {
  try {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      'size': 'invisible',
      'callback': (response) => {
        console.log('✅ reCAPTCHA vérifié');
      },
      'expired-callback': () => {
        console.warn('⚠️ reCAPTCHA expiré');
        recaptchaVerifier.render().then((widgetId) => {
          grecaptcha.reset(widgetId);
        });
      }
    });
    
    recaptchaVerifier.render().then((widgetId) => {
      console.log('🔐 reCAPTCHA rendu avec ID:', widgetId);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Erreur initialisation reCAPTCHA:', error);
    return false;
  }
}

/**
 * Envoie le code OTP au numéro de téléphone
 * @param {string} phoneNumber - Numéro de téléphone au format international (ex: +2250708404050)
 * @returns {Promise<{success: boolean, message: string, verificationId?: string}>}
 */
export async function sendOTP(phoneNumber) {
  try {
    console.log('📱 Envoi OTP à:', phoneNumber);
    
    // Vérifier que le reCAPTCHA est initialisé
    if (!recaptchaVerifier) {
      initRecaptcha();
    }
    
    // Pour le test local : accepter 123456 directement
    if (phoneNumber === '+2250708404050') {
      return {
        success: true,
        message: 'Code test: utilisez 123456',
        isTestNumber: true
      };
    }
    
    confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    
    console.log('✅ OTP envoyé avec succès');
    return {
      success: true,
      message: 'Code OTP envoyé',
      isTestNumber: false
    };
    
  } catch (error) {
    console.error('❌ Erreur envoi OTP:', error);
    
    let message = 'Erreur lors de l\'envoi du code';
    
    switch (error.code) {
      case 'auth/invalid-phone-number':
        message = 'Numéro de téléphone invalide';
        break;
      case 'auth/too-many-requests':
        message = 'Trop de tentatives. Réessayez plus tard.';
        break;
      case 'auth/captcha-check-failed':
        message = 'Vérification reCAPTCHA échouée';
        break;
      case 'auth/quota-exceeded':
        message = 'Quota SMS dépassé';
        break;
    }
    
    return { success: false, message };
  }
}

/**
 * Vérifie le code OTP et retourne l'ID token Firebase
 * @param {string} code - Code OTP à 6 chiffres
 * @returns {Promise<{success: boolean, message: string, idToken?: string, phoneNumber?: string}>}
 */
export async function verifyOTP(code) {
  try {
    // Mode test pour le numéro de test
    if (confirmationResult === null && code === '123456') {
      console.log('✅ Code test accepté (123456)');
      return {
        success: true,
        message: 'Connexion test réussie',
        idToken: 'test_token_' + Date.now(),
        phoneNumber: '+2250708404050',
        isTestMode: true
      };
    }
    
    if (!confirmationResult) {
      return {
        success: false,
        message: 'Aucune demande OTP en cours. Veuillez renvoyer le code.'
      };
    }
    
    const result = await confirmationResult.confirm(code);
    const idToken = await result.user.getIdToken();
    
    console.log('✅ OTP vérifié, token obtenu');
    
    // Réinitialiser pour la prochaine connexion
    confirmationResult = null;
    
    return {
      success: true,
      message: 'Connexion réussie',
      idToken,
      phoneNumber: result.user.phoneNumber,
      isTestMode: false
    };
    
  } catch (error) {
    console.error('❌ Erreur vérification OTP:', error);
    
    let message = 'Code invalide ou expiré';
    
    switch (error.code) {
      case 'auth/invalid-verification-code':
        message = 'Code OTP incorrect';
        break;
      case 'auth/code-expired':
        message = 'Code expiré. Renvoyez un nouveau code.';
        break;
      case 'auth/credential-already-in-use':
        message = 'Ce numéro est déjà lié à un autre compte';
        break;
    }
    
    return { success: false, message };
  }
}

/**
 * Réinitialise le reCAPTCHA pour une nouvelle tentative
 */
export function resetRecaptcha() {
  if (recaptchaVerifier) {
    recaptchaVerifier.render().then((widgetId) => {
      grecaptcha.reset(widgetId);
    });
  }
  confirmationResult = null;
}

/**
 * Déconnecte l'utilisateur Firebase
 */
export async function firebaseSignOut() {
  try {
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
    console.log('✅ Déconnexion Firebase réussie');
    resetRecaptcha();
    return true;
  } catch (error) {
    console.error('❌ Erreur déconnexion:', error);
    return false;
  }
}

export { auth };
