///home/guillaume/NetBeansJDKss/dev2/material-ui-vite/src/components/AuthGuard.js
import React from "react";
import { Navigate } from "react-router-dom";

export default function AuthGuard({ children, requireOnboarding = false }) {
  const dmUser = JSON.parse(localStorage.getItem("dmUser"));
  const clientToken = localStorage.getItem("token");
  const clientId = localStorage.getItem("clientId");
  const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;

  // 🔒 Pas connecté → redirection vers login (admin) ou login-client
  const isAdminAuth = dmUser && dmUser.userId;
  const isClientAuth = clientToken && clientId;

  // Si offline mais token/localStorage présents, autoriser (pas de ping réseau)
  if (!isAdminAuth && !isClientAuth) {
    if (isOffline && (dmUser || clientToken)) {
      return children;
    }
    return <Navigate to="/login" replace />;
  }

  // Si client authentifié, autoriser directement l'accès (pas de onboarding requis pour client)
  if (isClientAuth && !isAdminAuth) {
    return children;
  }

  // 🧭 Normalisation : si l’onboarding est terminé, on force onboardingRequired à false
  const onboardingRequired = dmUser.onboardingRequired && !dmUser.onboardingCompleted;

  // 🟢 Cas spécial : route qui exige l’onboarding
  if (requireOnboarding) {
    if (!onboardingRequired) {
      // Si l’utilisateur n’a pas besoin d’onboarding → redirection vers dashboard
      return <Navigate to="/dashboard" replace />;
    }
    // Sinon → autoriser l’accès au SetupWizard
    return children;
  }

  // 🔒 Cas général : utilisateur connecté mais onboarding pas terminé
  if (onboardingRequired) {
    return <Navigate to="/setup/wizard" replace />;
  }

  // ✅ Tout est bon → afficher la page protégée
  return children;
}
