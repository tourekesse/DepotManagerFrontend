import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";
import { UserProvider } from "./context/UserContext";
import AuthGuard from "./components/AuthGuard.jsx";
import BoissonApp from './views/pages/vente/BoissonApp';

/* =========================
   DASHBOARD (TEMPLATE CRUD)
   ========================= */
import CrudDashboard from "./crud-dashboard/CrudDashboard";
import DashboardHome from "./crud-dashboard/components/DashboardHome.jsx";

/* ===== MODULE PRODUITS (TON MÉTIER) ===== */
import ProductList from "./views/pages/produit/ProductList";
import ProductCreatePage from "./views/pages/produit/ProductCreatePage";
import ProductShow from "./views/pages/produit/ProductShow";
import ProductEdit from "./views/pages/produit/ProductEdit";

/* =========================
   PAGES PUBLIQUES (LAZY)
   ========================= */
const LoginPage = React.lazy(() => import("./views/pages/login/LoginPage"));
const Register = React.lazy(() => import("./views/pages/register/Register"));
const TrialRegisterPage = React.lazy(() => import("./views/pages/register/TrialRegisterPage"));
const RegisterSuccessPage = React.lazy(() => import("./views/pages/register/RegisterSuccessPage"));
const ActivationSuccessPage = React.lazy(() => import("./views/pages/register/ActivationSuccess"));
const ActivationErrorPage = React.lazy(() => import("./views/pages/register/ActivationError"));
const ResendActivationPage = React.lazy(() => import("./views/pages/register/ResendActivation"));
const Page404 = React.lazy(() => import("./views/pages/page404/Page404"));
const Page500 = React.lazy(() => import("./views/pages/page500/Page500"));
const HomePage = React.lazy(() => import("./views/home/HomePage"));

/* =========================
   AUTRES PAGES PROTÉGÉES
   ========================= */
const SetupWizard = React.lazy(() => import("./views/pages/setup/SetupWizard"));

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Suspense
          fallback={
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              minHeight="100vh"
            >
              <CircularProgress color="primary" />
            </Box>
          }
        >
          <Routes>
            {/* =========================
               DASHBOARD PROTÉGÉ (UN SEUL BLOC !)
               ========================= */}
            <Route
              path="/accueil"
              element={
                <AuthGuard>
                  <CrudDashboard />
                </AuthGuard>
              }
            >
              <Route index element={<DashboardHome />} />
              <Route path="produits" element={<ProductList />} />
              <Route path="produits/nouveau" element={<ProductCreatePage />} />
              <Route path="produits/:productId" element={<ProductShow />} />
              <Route path="produits/:productId/edit" element={<ProductEdit />} />

              {/* POINT DE VENTE */}
              <Route path="vente" element={<BoissonApp />} />
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
            <Route path="/register" element={<Register />} />
            <Route path="/essai" element={<TrialRegisterPage />} />
            <Route path="/register-success" element={<RegisterSuccessPage />} />
            <Route path="/activation-success" element={<ActivationSuccessPage />} />
            <Route path="/activation-error" element={<ActivationErrorPage />} />
            <Route path="/resend-activation" element={<ResendActivationPage />} />
            <Route path="/404" element={<Page404 />} />
            <Route path="/500" element={<Page500 />} />

            {/* ACCUEIL PUBLIC */}
            <Route path="/" element={<HomePage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </UserProvider>
  );
}