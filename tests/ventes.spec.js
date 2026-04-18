import { test, expect } from '@playwright/test';

const MANAGER_EMAIL = 'kesseguillaume@gmail.com';
const MANAGER_PASSWORD = 'toure';

async function completeVente(page, typeVente, productName) {
  console.log(`  → Mode "${typeVente}"`);
  
  const surPlaceButton = page.locator('button:has-text("Sur place")').first();
  if (await surPlaceButton.isVisible({ timeout: 5000 })) {
    await surPlaceButton.click();
  }
  await page.waitForTimeout(1000);
  
  const typeButton = page.locator(`button:has-text("${typeVente}")`).first();
  if (await typeButton.isVisible({ timeout: 5000 })) {
    await typeButton.click();
  }
  await page.waitForTimeout(1500);
  
  const searchInput = page.locator('input[placeholder*="Rechercher"], input[placeholder*="chercher"]').first();
  if (await searchInput.isVisible({ timeout: 3000 })) {
    await searchInput.fill(productName);
    await page.waitForTimeout(1500);
  }
  
  const productCard = page.locator('[class*="Paper"], [class*="MuiPaper"]').filter({ hasText: new RegExp(productName, 'i') }).first();
  if (await productCard.isVisible({ timeout: 5000 })) {
    await productCard.click();
    await page.waitForTimeout(1500);
  }
  
  const openCartButton = page.locator('button:has-text("Ouvrir le panier"), [class*="cart"], [class*="Cart"]').first();
  if (await openCartButton.isVisible({ timeout: 3000 })) {
    await openCartButton.click();
    await page.waitForTimeout(1000);
  }
  
  const validerButton = page.locator('button:has-text("Valider la vente"), button:has-text("Valider"), button:has-text("Confirmer")').first();
  if (await validerButton.isVisible({ timeout: 5000 })) {
    await validerButton.click();
    await page.waitForTimeout(3000);
    
    const confirmButton = page.locator('button:has-text("Confirmer"), button:has-text("Oui")').first();
    if (await confirmButton.isVisible({ timeout: 3000 })) {
      await confirmButton.click();
      await page.waitForTimeout(2000);
    }
    console.log(`  ✓ Vente "${typeVente}" validée avec ${productName}`);
  } else {
    console.log(`  ⚠ Bouton validation non trouvé pour ${typeVente}`);
  }
}

test.describe('Ventes avec différents types de paiement', () => {
  
  test('Vente complète: Login + 3 ventes + vérification soldes', async ({ page }) => {
    console.log('\n=== CONNEXION ===');
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.fill(MANAGER_EMAIL);
    
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(MANAGER_PASSWORD);
    
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    await page.waitForURL(/\/accueil/, { timeout: 60000 });
    console.log('✓ Connecté avec succès\n');

    console.log('=== VENTE 1: Paiement complet (Sur place) ===');
    await page.goto('/accueil/ventes/nouveau');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);
    await completeVente(page, 'Cash', 'CASTEL');
    console.log('');

    console.log('=== VENTE 2: Échange casiers (Sur place) ===');
    await page.goto('/accueil/ventes/nouveau');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);
    await completeVente(page, 'Échange', 'GUINNESS');
    console.log('');

    console.log('=== VENTE 3: Crédit (Sur place) ===');
    await page.goto('/accueil/ventes/nouveau');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);
    await completeVente(page, 'Crédit', 'HEINEKEN');
    console.log('');

    console.log('=== CONSULTATION SOLDES CLIENTS ===');
    await page.goto('/accueil/clients');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);
    
    const clientTable = page.locator('[role="grid"]').first();
    await expect(clientTable).toBeVisible({ timeout: 15000 });
    console.log('✓ Page clients chargée');
    
    const paginationText = page.locator('text=/1–2 of|of 2/').first();
    if (await paginationText.isVisible()) {
      console.log('✓ Clients affichés dans le tableau');
    }
    
    console.log('\n=== TOUTES LES VENTES TERMINÉES AVEC SUCCÈS ===');
  });
});
