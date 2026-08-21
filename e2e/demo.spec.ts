import { test, expect } from "@playwright/test";
import { fetchVerificationToken } from "./helpers/activation";

/**
 * Demo E2E DepotManager — parcours complet (video HD 1280x720).
 *
 * Étapes :
 *   1. Accueil → "Commencer" (route /essai)
 *   2. Formulaire essai 14 jours → "Créer mon compte"
 *   3. Message "Inscription réussie" → page /register-success
 *   4. Activation du compte : récupération du token en DB + requête directe
 *      au backend /api/auth/verify-email (sans ouvrir Gmail)
 *   5. Connexion (bouton "Se connecter")
 *   6. Onboarding Bar : CI par défaut → "Créer mon bar" → /accueil
 *
 * Variables d'environnement (copier e2e/.env.example vers e2e/.env) :
 *   APP_URL      URL de l'app (defaut https://depotmanager.gm-soft.ca)
 *   DEMO_EMAIL   email de demo (defaut demo.bar@example.com)
 *   DEMO_PASSWORD mot de passe de demo
 *   DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME  acces MySQL (defaut VPS)
 */

test("Parcours demo complet : inscription -> activation -> connexion -> onboarding bar", async ({
  page,
  browser,
  request,
}) => {
  const appUrl = process.env.APP_URL || "https://depotmanager.gm-soft.ca";
  const password = process.env.DEMO_PASSWORD || "Demo@2026!";
  const devApiKey = process.env.DEV_API_KEY || "openai-test-key";
  const stamp = Date.now().toString().slice(-6);
  const uniqueEmail = process.env.DEMO_EMAIL || `demo.bar+${stamp}@example.com`;

  // ---------------------------------------------------------------
  // 1. Accueil -> bouton "Commencer"
  //    On attend 'load' (pas 'networkidle' : les CSS externes primereact
  //    renvoient 404 et bloqueraient networkidle), puis on scrolle.
  // ---------------------------------------------------------------
  await page.goto(`${appUrl}/`, { waitUntil: "load" });
  await page.waitForSelector("#root", { state: "attached" });
  await page.waitForTimeout(4000);

  // Le bouton "Commencer" est dans la carte "Version d'essai 14 jours",
  // possiblement sous la ligne de flottaison → on scrolle jusqu'à lui.
  const startBtn = page
    .locator("button")
    .filter({ hasText: "Commencer" })
    .first();
  await startBtn.scrollIntoViewIfNeeded();
  await startBtn.click();
  await page.waitForURL("**/essai");

  // ---------------------------------------------------------------
  // 2. Formulaire Essai Gratuit 14 jours
  // ---------------------------------------------------------------
  const form = page.getByText("🚀 Essai Gratuit 14 jours");
  await expect(form).toBeVisible();

  await page.locator('input[name="firstName"]').fill("Demon");
  await page.locator('input[name="lastName"]').fill("Bar");
  await page.locator('input[type="email"]').fill(uniqueEmail);
  await page.locator('input[type="password"]').fill(password);

  // Sélecteur de profil : "Propriétaire"
  await page.getByRole("combobox", { name: /profil/i }).click();
  await page.getByRole("option", { name: "Propriétaire" }).click();
  await page.waitForTimeout(500);

  await page.getByRole("button", { name: "Créer mon compte" }).click();

  // Message de succès
  await expect(page.getByText(/compte/i).first()).toBeVisible();
  await page.waitForTimeout(1500);

  // ---------------------------------------------------------------
  // 3. Page /register-success (email envoyé)
  // ---------------------------------------------------------------
  await page.waitForURL("**/register-success");
  await expect(
    page.getByText(/e-mail de vérification a été envoyé/i)
  ).toBeVisible();
  await page.waitForTimeout(2000);

  // ---------------------------------------------------------------
  // 4. Activation via requête directe au backend (pas de Gmail)
  //    Note : l'email/DB utilisent un token. On le lit en DB puis on
  //    appelle /api/auth/verify-email pour activer le compte.
  // ---------------------------------------------------------------
  const token = await fetchVerificationToken(appUrl, uniqueEmail, devApiKey);
  const activateUrl = `${appUrl}/api/auth/verify-email?token=${encodeURIComponent(
    token
  )}`;
  const activateRes = await request.get(activateUrl, { maxRedirects: 0 });
  expect([301, 302, 303, 200]).toContain(activateRes.status());

  // On navigue explicitement vers la page de succès d'activation
  await page.goto(`${appUrl}/activation-success`);
  await expect(page).toHaveURL(/activation-success/);
  await page.waitForTimeout(2000);

  // ---------------------------------------------------------------
  // 5. Connexion
  // ---------------------------------------------------------------
  await page.goto(`${appUrl}/login`);
  await page.getByLabel("Email ou Téléphone").fill(uniqueEmail);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();

  // L'utilisateur n'a pas encore terminé son onboarding -> /setup/wizard
  await page.waitForURL("**/setup/wizard");
  await page.waitForTimeout(1500);

  // ---------------------------------------------------------------
  // 6. Onboarding Bar (SetupOnboarding -> SetupWizardBar)
  //    L'écran "Bar ou Dépôt ?" peut apparaître si le type n'est pas déduit.
  // ---------------------------------------------------------------
  const barCard = page.getByText("Bar", { exact: true }).first();
  if (await barCard.isVisible().catch(() => false)) {
    await barCard.click();
    await page.waitForTimeout(1000);
  }

  // Pays : la Côte d'Ivoire (CI) est le pays par défaut/fallback.
  // On s'assure que la carte "Cote d'Ivoire" est sélectionnée.
  const ciCard = page.getByText("Cote d'Ivoire", { exact: true }).first();
  if (await ciCard.isVisible().catch(() => false)) {
    await ciCard.click();
  }

  await page.getByLabel(/Nom du bar/i).fill("gmsoft Bar Demo");
  await page.getByLabel(/Téléphone/i).fill("0708404055");
  await page.getByLabel(/Quartier/i).fill("Cocody Angré");
  await page.waitForTimeout(500);

  await page.getByRole("button", { name: "Créer mon bar" }).click();

  // ---------------------------------------------------------------
  // 7. Tableau de bord /accueil
  // ---------------------------------------------------------------
  await page.waitForURL("**/accueil");
  await page.waitForTimeout(3000);

  // Pause finale pour laisser la video capturer le dashboard
  await page.waitForTimeout(4000);

  // Journal des infos utiles pour le re-run manuel
  // eslint-disable-next-line no-console
  console.log(`Demo terminee. Compte: ${uniqueEmail} / ${password}`);
});
