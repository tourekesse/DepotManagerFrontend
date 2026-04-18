import React, { Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";

import { UserProvider } from "./context/UserContext";
import AuthGuard from "./components/AuthGuard.jsx";
import ClientAuthGuard from "./components/ClientAuthGuard.jsx";
import pushNotifications from "./utils/pushNotifications.js";

// 🚀 PWA Components
import PWAInstaller from "./components/PWAInstaller";
import OfflineSalesManager from "./components/OfflineSalesManager";

import BoissonApp from "./views/pages/vente/BoissonApp";
import PanierPage from "./views/pages/vente/PanierPage";
import PanierDemoPage from "./views/pages/vente/PanierDemoPage";
/* =========================
   DASHBOARD (TEMPLATE CRUD)
   ========================= */
import CrudDashboard from "./crud-dashboard/CrudDashboard";
import DashboardHome from "./crud-dashboard/components/DashboardHome.jsx";
// Chemin corrigé selon votre arborescence réelle

import CommandeDepotList from './views/pages/vente/CommandeDepotList';
import LivraisonList from './views/pages/livraison/LivraisonList';
import MesLivraisonsPage from './views/pages/livraison/MesLivraisonsPage';
import LivraisonHistoriquePage from './views/pages/livraison/LivraisonHistoriquePage';
import CatalogueClientMobile from './views/pages/mobile/CatalogueClientMobile';
import BarVente from "./views/pages/bar/BarVente";
import BarInventory from "./views/pages/bar/BarInventory";
import BarProductCreatePage from "./views/pages/bar/BarProductCreatePage";
import CreateGerantBar from "./views/pages/bar/CreateGerantBar";


/* ===== MODULE PRODUITS (TON MÉTIER) ===== */
import ProductList from "./views/pages/produit/ProductList";
import ProductCreatePage from "./views/pages/produit/ProductCreatePage";
import ProductShow from "./views/pages/produit/ProductShow";
import ProductEdit from "./views/pages/produit/ProductEdit";

/* ===== MODULE CLIENTS (GESTION) ===== */
import ClientPage from "./views/pages/client/ClientPage";
import DashboardGerant from "./views/pages/gerant/DashboardGerant";

/* ===== MODULE LIVREURS (ADMIN) ===== */
const LoginPage = React.lazy(() => import("./views/pages/login/LoginPage"));
const LoginOtpPage = React.lazy(() => import("./views/pages/login/LoginOtpPage"));
const Register = React.lazy(() => import("./views/pages/register/Register"));
const TrialRegisterPage = React.lazy(() => import("./views/pages/register/TrialRegisterPage"));
const RegisterSuccessPage = React.lazy(() => import("./views/pages/register/RegisterSuccessPage"));
const ActivationSuccessPage = React.lazy(() => import("./views/pages/register/ActivationSuccess"));
const ActivationErrorPage = React.lazy(() => import("./views/pages/register/ActivationError"));
const ResendActivationPage = React.lazy(() => import("./views/pages/register/ResendActivation"));
const LoginClientMobile = React.lazy(() => import("./views/pages/client/LoginClientMobile"));
const ActivationPage = React.lazy(() => import("./views/pages/client/ActivationPage"));
const EspaceClient = React.lazy(() => import("./views/pages/client/EspaceClient"));
const CommandeClient = React.lazy(() => import("./views/pages/client/CommandeClient"));
const Page404 = React.lazy(() => import("./views/pages/page404/Page404"));
const Page500 = React.lazy(() => import("./views/pages/page500/Page500"));
const HomePage = React.lazy(() => import("./views/home/HomePage"));
const ChangePasswordPage = React.lazy(() => import("./views/pages/ChangePasswordPage"));

/* =========================
   AUTRES PAGES PROTÉGÉES
   ========================= */
const SetupWizard = React.lazy(() => import("./views/pages/setup/SetupWizard"));
import LivreurPage from "./views/pages/livreur/LivreurPage";
import LivreurCreatePage from "./views/pages/livreur/LivreurCreatePage";
import CaisseOuverture from "./views/pages/caisse/CaisseOuverture";
import CaisseFermeture from "./views/pages/caisse/CaisseFermeture";
import CaisseJournal from "./views/pages/caisse/CaisseJournal";
import CaisseMouvement from "./views/pages/caisse/CaisseMouvement";
import AjustementClient from "./views/pages/caisse/AjustementClient";
import AjustementClientMobile from "./views/pages/caisse/AjustementClientMobile";
import AjustementClientRapide from "./views/pages/caisse/AjustementClientRapide";
import CommandeMobileList from "./views/pages/commande/CommandeMobileList";
import CommandeHistoriquePage from "./views/pages/commande/CommandeHistoriquePage";
import CommandesRetraitList from "./views/pages/retrait/CommandesRetraitList";
import MesCommandesPage from "./views/pages/commande/MesCommandesPage";

/* ===== 🔴 NOUVEAU: MODULE GPS TRACKING ===== */
import GpsTrackingPage from "./views/pages/gps/GpsTrackingPage";

/* ===== MODULE ABONNEMENTS ===== */
import AbonnementPaymentPage from "./views/pages/abonnement/AbonnementPaymentPage";
import AbonnementListPage from "./views/pages/abonnement/AbonnementListPage";
import AbonnementRenouvellementPage from "./views/pages/abonnement/AbonnementRenouvellementPage";
import MonAbonnementPage from "./views/pages/abonnement/MonAbonnementPage";
import ApprovisionnementPage from "./pages/approvisionnement/ApprovisionnementPage";
import FournisseursPage from "./pages/approvisionnement/FournisseursPage";
import BonsReceptionPage from "./pages/approvisionnement/BonsReceptionPage";
import NouveauBonReceptionPage from "./pages/approvisionnement/NouveauBonReceptionPage";

export default function App() {
  console.log('🚀 App.jsx loaded - version 2026-03-01');
  
  // 📱 Initialiser les push notifications au démarrage
  useEffect(() => {
    const initializePush = async () => {
      try {
        // Initialiser pour le client Tatiana (ID: 1)
        await pushNotifications.initialize(1);
        
        // Afficher une notification de test après 2 secondes
        setTimeout(() => {
          pushNotifications.showTestNotification();
        }, 2000);
        
      } catch (error) {
        console.error('❌ Erreur initialisation push:', error);
      }
    };
    
    initializePush();
  }, []);

  // 🚀 Service Worker registration pour PWA (DÉSACTIVÉ en développement)
  useEffect(() => {
    const registerServiceWorker = async () => {
      // Désactiver le Service Worker en développement pour éviter les conflits
      if (import.meta.env.DEV) {
        console.log('🔧 Service Worker désactivé en développement');
        return;
      }
      
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.register('/sw-mobile.js');
          console.log('🔧 Mobile Service Worker registered:', registration);
          
          // Vérifier les mises à jour
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nouvelle version disponible
                if (window.confirm('Une nouvelle version est disponible. Recharger maintenant ?')) {
                  window.location.reload();
                }
              }
            });
          });
        } catch (error) {
          console.error('❌ Service Worker registration failed:', error);
        }
      }
    };

    registerServiceWorker();
  }, []);

  return (
    <UserProvider>
      <BrowserRouter>
        {/* 🚀 PWA Components */}
        <PWAInstaller />
        <OfflineSalesManager />
        
        <Suspense
          fallback={
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              minHeight="100vh"
              sx={{
                minHeight: '100vh',
                background: 'linear-gradient(180deg, #f9fafb 0%, #ffffff 100%)',
              }}
            >
              <CircularProgress color="primary" />
            </Box>
          }
        >
          <Routes>

            {/* =========================
               DASHBOARD PROTÉGÉ
               ========================= */}
            <Route
              path="/accueil"
              element={
                <AuthGuard>
                  <CrudDashboard />
                </AuthGuard>
              }
            >
              {/* 🔹 PAGE PAR DÉFAUT DU DASHBOARD */}
              <Route index element={<DashboardHome />} />
              {/* 🔹 PRODUITS (TON MODULE MÉTIER) */}
              <Route path="produits" element={<ProductList />} />
              <Route path="produits/nouveau" element={<ProductCreatePage />} />
              <Route path="produits/:productId" element={<ProductShow />} />
              <Route path="produits/:productId/edit" element={<ProductEdit />} />
             {/* 🔹 AJOUTE CETTE LIGNE ICI POUR LA COMMANDE DÉPÔT */}
<Route path="commandes-depot" element={<CommandeDepotList />} />
<Route path="commandes" element={<CommandeDepotList />} />
<Route path="commandes/nouveau" element={<BoissonApp />} />
<Route path="panier" element={<PanierPage />} />
<Route path="panier-demo" element={<PanierDemoPage />} />
{/* 🔹 CLIENTS (ADMIN) */}
<Route path="clients" element={<ClientPage />} />
{/* 🔹 GÉRANT (DASHBOARD) */}
<Route path="gerant/dashboard" element={<DashboardGerant />} />
{/* 🔹 LIVREURS (ADMIN) */}
<Route path="livreurs" element={<LivreurPage />} />
<Route path="livreurs/nouveau" element={<LivreurCreatePage />} />

              {/* 🔹 LIVRAISONS (VENTES NON LIVRÉES) */}
              <Route path="livraisons" element={<LivraisonList />} />
              <Route path="livraisons/mes-livraisons" element={<MesLivraisonsPage />} />
              <Route path="livraisons/historique" element={<LivraisonHistoriquePage />} />

              {/* 🔹 CAISSE */}
              <Route path="caisse/ouverture" element={<CaisseOuverture />} />
              <Route path="caisse/fermeture" element={<CaisseFermeture />} />
              <Route path="caisse/mouvement" element={<CaisseMouvement />} />
              <Route path="caisse/journal" element={<CaisseJournal />} />
              <Route path="caisse/ajuster-client" element={<AjustementClientMobile />} />
              <Route path="caisse/ajuster-client-desktop" element={<AjustementClient />} />
              <Route path="caisse/ajuster-rapide" element={<AjustementClientRapide />} />

              {/* 🔹 COMMANDES MOBILES */}
              <Route path="commandes-mobiles" element={<CommandeMobileList />} />
              <Route path="commandes-mobiles/historique" element={<CommandeHistoriquePage />} />
              <Route path="commandes-a-retirer" element={<CommandesRetraitList />} />
              <Route path="commandes-mobiles/nouvelle" element={<CatalogueClientMobile />} />
              <Route path="mes-commandes" element={<MesCommandesPage />} />
              {/* 🔹 VENTE BAR (client bar uniquement) */}
              <Route path="bar/ventes" element={<BarVente />} />
              <Route path="bar/inventaire" element={<BarInventory />} />
              <Route path="bar/catalogue" element={<BarProductCreatePage />} />
              <Route path="bar/gerants/nouveau" element={<CreateGerantBar />} />

              {/* 🔹 APPROVISIONNEMENT */}
              <Route path="approvisionnement" element={<ApprovisionnementPage />} />
              <Route path="approvisionnement/fournisseurs" element={<FournisseursPage />} />
              <Route path="approvisionnement/bons" element={<BonsReceptionPage />} />
              <Route path="approvisionnement/bons/nouveau" element={<NouveauBonReceptionPage />} />

              {/* 🔹 ABONNEMENTS */}
              <Route path="abonnements" element={<AbonnementListPage />} />
              <Route path="abonnements/payer" element={<MonAbonnementPage />} />
              <Route path="abonnements/renouveler" element={<AbonnementRenouvellementPage />} />
              <Route path="mon-abonnement" element={<MonAbonnementPage />} />

              {/* 🔴 NOUVEAU: GPS TRACKING */}
              <Route path="gps-tracking" element={<GpsTrackingPage />} />

            </Route>

            {/* =========================
               AUTRES ROUTES PROTÉGÉES
               ========================= */}
            <Route
              path="/setup/wizard"
              element={
                <AuthGuard requireOnboarding={true}>
                  <SetupWizard />
                </AuthGuard>
              }
            />

            {/* =========================
               ROUTES PUBLIQUES
               ========================= */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/login-otp" element={<LoginOtpPage />} />
            <Route path="/login-client" element={<LoginClientMobile />} />
            <Route path="/activation" element={<ActivationPage />} />
            <Route path="/espace-client" element={<EspaceClient />} />
            <Route path="/commande-client" element={<CommandeClient />} />
            <Route path="/register" element={<Register />} />
            <Route path="/essai" element={<TrialRegisterPage />} />
            <Route path="/register-success" element={<RegisterSuccessPage />} />
            <Route path="/activation-success" element={<ActivationSuccessPage />} />
            <Route path="/activation-error" element={<ActivationErrorPage />} />
            <Route path="/resend-activation" element={<ResendActivationPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route path="/404" element={<Page404 />} />
            <Route path="/500" element={<Page500 />} />

            {/* =========================
               ACCUEIL PUBLIC
               ========================= */}
            <Route path="/" element={<HomePage />} />
            <Route path="*" element={<HomePage />} />

          </Routes>
        </Suspense>
      </BrowserRouter>
    </UserProvider>
  );
}
