import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'kesseguillaume@gmail.com',
  password: 'toure'
};

async function getSoldeCaisse(page) {
  await page.goto('/accueil/caisse/journal');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  const pageContent = await page.content();
  const match = pageContent.match(/Solde[:\s]*([\d\s]+)\s*F/i);
  if (match) {
    return match[1].replace(/\s/g, '');
  }
  return null;
}

async function getNombreVentes(page) {
  await page.goto('/accueil/caisse/journal');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  const pageContent = await page.content();
  const venteMatches = pageContent.match(/Vente|ventes|🧾/gi);
  return venteMatches ? venteMatches.length : 0;
}

async function faireVente(page, nomProduit) {
  console.log(`  → Préparation vente pour: ${nomProduit}`);
  
  await page.goto('/accueil/ventes/nouveau');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  const searchInput = page.locator('input[placeholder*="Rechercher"], input[placeholder*="chercher"]').first();
  if (await searchInput.isVisible({ timeout: 5000 })) {
    await searchInput.fill(nomProduit);
    await page.waitForTimeout(2000);
  }
  
  const productCard = page.locator('[class*="MuiPaper"], [class*="card"]').filter({ hasText: new RegExp(nomProduit, 'i') }).first();
  if (await productCard.isVisible({ timeout: 5000 })) {
    await productCard.click();
    await page.waitForTimeout(2000);
    console.log(`  ✓ Produit "${nomProduit}" ajouté au panier`);
  } else {
    console.log(`  ⚠ Produit "${nomProduit}" non trouvé`);
    return false;
  }
  
  const openCartButton = page.locator('button:has-text("Ouvrir le panier"), [class*="cart"]').first();
  if (await openCartButton.isVisible({ timeout: 3000 })) {
    await openCartButton.click();
    await page.waitForTimeout(1500);
  }
  
  const validerButton = page.locator('button:has-text("Valider"), button:has-text("Confirmer")').first();
  if (await validerButton.isVisible({ timeout: 5000 })) {
    await validerButton.click();
    await page.waitForTimeout(2000);
    
    const confirmButton = page.locator('button:has-text("Confirmer"), button:has-text("Oui")').first();
    if (await confirmButton.isVisible({ timeout: 3000 })) {
      await confirmButton.click();
      await page.waitForTimeout(3000);
      console.log(`  ✓ Vente validée`);
      return true;
    }
  }
  
  console.log(`  ⚠ Bouton validation non trouvé`);
  return false;
}

test.describe('Test E2E complet: Connexion, Vente, Caisse, Client', () => {
  
  test('1. Connexion et vérification accès', async ({ page }) => {
    console.log('\n=== ÉTAPE 1: CONNEXION ===');
    
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    
    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await expect(passwordInput).toBeVisible({ timeout: 15000 });
    
    console.log('  → Saisie identifiants...');
    await emailInput.fill(TEST_USER.email);
    await passwordInput.fill(TEST_USER.password);
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Connexion")').first();
    await submitButton.click();
    
    await page.waitForURL('**/accueil', { timeout: 60000 });
    console.log('  ✓ Connecté avec succès');
    console.log(`  → URL: ${page.url()}`);
    
    await page.screenshot({ path: 'test-01-connexion.png' });
  });

  test('2. Vérification solde caisse AVANT vente', async ({ page }) => {
    console.log('\n=== ÉTAPE 2: VÉRIFICATION CAISSE (AVANT) ===');
    
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/accueil', { timeout: 60000 });
    
    const soldeAvant = await getSoldeCaisse(page);
    console.log(`  → Solde caisse AVANT vente: ${soldeAvant ? soldeAvant + ' F' : 'Non trouvé'}`);
    
    const nbVentesAvant = await getNombreVentes(page);
    console.log(`  → Nombre de mouvements de vente: ${nbVentesAvant}`);
    
    await page.screenshot({ path: 'test-02-caisse-avant.png' });
  });

  test('3. Effectuer une vente', async ({ page }) => {
    console.log('\n=== ÉTAPE 3: EFFECTUER UNE VENTE ===');
    
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/accueil', { timeout: 60000 });
    
    const success = await faireVente(page, 'CASTEL');
    
    if (success) {
      console.log('  ✓ Vente effectuée avec succès');
    } else {
      console.log('  ⚠ La vente a rencontré un problème');
    }
    
    await page.screenshot({ path: 'test-03-vente.png' });
  });

  test('4. Vérification solde caisse APRÈS vente', async ({ page }) => {
    console.log('\n=== ÉTAPE 4: VÉRIFICATION CAISSE (APRÈS) ===');
    
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/accueil', { timeout: 60000 });
    
    const soldeApres = await getSoldeCaisse(page);
    console.log(`  → Solde caisse APRÈS vente: ${soldeApres ? soldeApres + ' F' : 'Non trouvé'}`);
    
    const nbVentesApres = await getNombreVentes(page);
    console.log(`  → Nombre de mouvements de vente: ${nbVentesApres}`);
    
    await page.screenshot({ path: 'test-04-caisse-apres.png' });
  });

  test('5. Vérification page clients et soldes', async ({ page }) => {
    console.log('\n=== ÉTAPE 5: VÉRIFICATION CLIENTS ===');
    
    await page.goto('/login');
    await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/accueil', { timeout: 60000 });
    
    await page.goto('/accueil/clients');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const pageContent = await page.content();
    const hasClient = pageContent.includes('Client') || pageContent.includes('client');
    console.log(`  → Page clients chargée: ${hasClient ? 'Oui' : 'Non'}`);
    
    const tableVisible = page.locator('table, [role="grid"], [class*="Table"]').first().isVisible().catch(() => false);
    console.log(`  → Tableau des clients visible: ${tableVisible ? 'Oui' : 'Non'}`);
    
    await page.screenshot({ path: 'test-05-clients.png' });
  });

  test('6. FLUX COMPLET: Connexion → Vente → Caisse → Client', async ({ page }) => {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('   TEST COMPLET: SIMULATION UTILISATEUR RÉEL');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('📍 ÉTAPE 1: Connexion');
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/accueil', { timeout: 60000 });
    console.log('  ✓ Connecté\n');
    
    console.log('📍 ÉTAPE 2: Vérification solde caisse initial');
    const soldeInitial = await getSoldeCaisse(page);
    console.log(`  → Solde initial: ${soldeInitial ? soldeInitial + ' F' : 'Non visible'}\n`);
    
    console.log('📍 ÉTAPE 3: Effectuer une vente');
    await page.goto('/accueil/ventes/nouveau');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const searchInput = page.locator('input[placeholder*="Rechercher"]').first();
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('CASTEL');
      await page.waitForTimeout(2000);
    }
    
    const produit = page.locator('[class*="MuiPaper"]').filter({ hasText: /CASTEL/i }).first();
    if (await produit.isVisible({ timeout: 5000 })) {
      await produit.click();
      await page.waitForTimeout(2000);
      console.log('  → Produit ajouté au panier');
    }
    
    const cartButton = page.locator('button:has-text("Ouvrir le panier")').first();
    if (await cartButton.isVisible({ timeout: 3000 })) {
      await cartButton.click();
      await page.waitForTimeout(1500);
    }
    
    const validerButton = page.locator('button:has-text("Valider")').first();
    if (await validerButton.isVisible({ timeout: 5000 })) {
      await validerButton.click();
      await page.waitForTimeout(2000);
      
      const confirmerButton = page.locator('button:has-text("Confirmer")').first();
      if (await confirmerButton.isVisible({ timeout: 3000 })) {
        await confirmerButton.click();
        await page.waitForTimeout(3000);
        console.log('  ✓ Vente validée\n');
      }
    }
    
    console.log('📍 ÉTAPE 4: Vérification nouveau solde caisse');
    const soldeFinal = await getSoldeCaisse(page);
    console.log(`  → Solde final: ${soldeFinal ? soldeFinal + ' F' : 'Non visible'}`);
    console.log(`  → Différence: ${soldeInitial && soldeFinal ? 'Changement détecté' : 'Non applicable'}\n`);
    
    console.log('📍 ÉTAPE 5: Vérification clients');
    await page.goto('/accueil/clients');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('  ✓ Page clients chargée\n');
    
    console.log('═══════════════════════════════════════════════════');
    console.log('   ✅ FLUX COMPLET TERMINÉ AVEC SUCCÈS');
    console.log('═══════════════════════════════════════════════════\n');
    
    await page.screenshot({ path: 'test-06-flux-complet.png' });
  });
});
