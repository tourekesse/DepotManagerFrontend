///home/guillaume/NetBeansJDKss/dev2/material-ui-vite/src/components/AuthGuard.js
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { syncClientSession, getConnectedRole, getConnectedClientId } from "../utils/sessionAuth";

// Routes accessibles aux clients bars sans être admin
const CLIENT_ROUTES = [
  '/accueil/commandes-mobiles',
  '/accueil/commandes-mobiles/vente',
  '/accueil/commandes-mobiles/nouvelle',
  '/accueil/commandes/nouveau',
  '/accueil/commandes',
  '/accueil/bar/ventes'
];

export default function AuthGuard({ children, requireOnboarding = false }) {
  const [isClientReady, setIsClientReady] = useState(false);
  const location = useLocation();
  
  // Vérification côté client uniquement (évite erreur SSR)
  useEffect(() => {
    setIsClientReady(true);
  }, []);

  const dmUser = isClientReady ? JSON.parse(localStorage.getItem("dmUser") || "null") : null;
  const clientToken = isClientReady ? localStorage.getItem("token") : null;
  let clientId = isClientReady ? localStorage.getItem("clientId") : null;
  let userRole = isClientReady ? localStorage.getItem("role") : null;

  if (isClientReady) {
    const session = syncClientSession();
    clientId = clientId || session.clientId;
    userRole = userRole || session.role;
  }

  const connectedRole = isClientReady ? getConnectedRole() : "";
  const connectedClientId = isClientReady ? getConnectedClientId() : null;
  const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;

  // 🔍 DEBUG LOGS
  console.log('🔍 AuthGuard DEBUG:', {
    isClientReady,
    dmUser,
    clientToken: clientToken ? 'EXISTS' : 'NULL',
    clientId,
    userRole,
    location: location.pathname
  });

  // 🔒 Attendre que le client soit prêt avant de vérifier l'auth
  if (!isClientReady) {
    console.log('🔍 AuthGuard: Client not ready - waiting...');
    return null; // Ne rien afficher pendant le chargement
  }

  // 🔒 Pas connecté → redirection vers login (admin) ou login-client
  const staffRoles = new Set([
    "ADMINISTRATEUR",
    "ADMINISTRATEUR GENERAL",
    "ADMINISTRATEUR GÉNÉRAL",
    "GERANT_DEPOT",
    "GERANT_BAR",
    "GERANT_SOUSDEPOT",
    "PROPRIETAIRE_DEPOT",
    "PROPRIETAIRE_SOUS_DEPOT",
    "PROPRIETAIRE_BAR",
    "PROPRIETAIRE_SOUS_DEPOT_BAR",
    "PROPRIETAIRE_SOUS_USER_DEPOT",
    "LIVREUR",
  ]);
  const roleUpper = (connectedRole || userRole || dmUser?.role || "").toUpperCase();
  const isStaffUser = staffRoles.has(roleUpper) || (roleUpper && !["CLIENT_BAR", ""].includes(roleUpper) && dmUser?.userId);
  const isAdminAuth = clientToken && (dmUser?.userId || isStaffUser);
  const isClientAuth = clientToken && (connectedClientId || clientId || localStorage.getItem("userId"));

  console.log('🔍 AuthGuard AUTH STATUS:', {
    isAdminAuth,
    isClientAuth,
    dmUserUserId: dmUser?.userId,
    dmUserRole: dmUser?.role,
    storedRole: userRole
  });

  // Vérifier si la route actuelle est une route client autorisée
  const isClientRoute = CLIENT_ROUTES.some(route => location.pathname.startsWith(route));

  // Si offline mais token/localStorage présents, autoriser (pas de ping réseau)
  if (!isAdminAuth && !isClientAuth) {
    console.log('🔍 AuthGuard: NOT AUTHENTICATED - redirecting to login');
    if (isOffline && (dmUser || clientToken)) {
      return children;
    }
    // Rediriger vers le bon login selon le rôle stocké
    if (userRole === "CLIENT_BAR" || clientId) {
      console.log('🔍 AuthGuard: Redirecting to /login-client');
      return <Navigate to="/login-client" replace />;
    }
    console.log('🔍 AuthGuard: Redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  // ✅ Admin authentifié → autoriser directement
  if (isAdminAuth) {
    console.log('🔍 AuthGuard: Admin auth - ALLOWED');
    return children;
  }

  // Si client authentifié sur une route client autorisée, autoriser l'accès
  if (isClientAuth && isClientRoute) {
    console.log('🔍 AuthGuard: Client auth on client route - ALLOWED');
    return children;
  }

  // Si client authentifié (seulement client, pas admin), autoriser directement l'accès
  if (isClientAuth && !isAdminAuth) {
    console.log('🔍 AuthGuard: Client auth only - ALLOWED');
    return children;
  }

  const onboardingRequired = dmUser?.onboardingRequired && !dmUser?.onboardingCompleted;
  console.log('🔍 AuthGuard: Onboarding check:', { onboardingRequired });

  // 🟢 Cas spécial : route qui exige l'onboarding
  if (requireOnboarding) {
    if (!onboardingRequired) {
      // Si l'utilisateur n'a pas besoin d'onboarding → redirection vers dashboard
      return <Navigate to="/accueil" replace />;
    }
    // Sinon → autoriser l'accès au SetupWizard
    return children;
  }

  // 🔒 Cas général : utilisateur connecté mais onboarding pas terminé
  if (onboardingRequired) {
    console.log('🔍 AuthGuard: Onboarding required - redirecting to /setup/wizard');
    return <Navigate to="/setup/wizard" replace />;
  }

  // ✅ Tout est bon → afficher la page protégée
  console.log('🔍 AuthGuard: ALL CHECKS PASSED - ALLOWING ACCESS');
  return children;
}
