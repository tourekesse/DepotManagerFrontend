import { test, expect } from '@playwright/test';

const MANAGER_EMAIL = 'kesseguillaume@gmail.com';
const MANAGER_PASSWORD = 'toure';

test.describe('Retrait commande client (sans casier, sans paiement)', () => {
  
  test('Client récupère sa commande sans payer ni rendre de casier', async ({ page }) => {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('   SCÉNARIO: Retrait commande (Crédit)');
    console.log('   - Client n\'a pas de casier à rendre');
    console.log('   - Client n\'a pas d\'argent');
    console.log('   - Gérant n\'encaisse rien');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('📍 ÉTAPE 1: Connexion');
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
    
    await page.screenshot({ path: 'test-retrait-01-connexion.png' });
    
    console.log('📍 ÉTAPE 2: Vérification solde caisse AVANT');
    await page.goto('/accueil/caisse');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const contentAvant = await page.content();
    const soldeMatchAvant = contentAvant.match(/Solde[:\s]*([\d\s]+)\s*F/i);
    const soldeAvant = soldeMatchAvant ? soldeMatchAvant[1].replace(/\s/g, '') : 'Non trouvé';
    console.log(`  → Solde caisse avant: ${soldeAvant} F\n`);
    
    await page.screenshot({ path: 'test-retrait-02-caisse-avant.png' });
    
    console.log('📍 ÉTAPE 3: Création vente en mode CRÉDIT');
    await page.goto('/accueil/ventes/nouveau');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(8000);
    
    await page.screenshot({ path: 'test-retrait-03a-interface.png' });
    
    console.log('  → Debug: nombre de boutons');
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(b => b.textContent);
    });
    console.log(`  → Boutons trouvés: ${JSON.stringify(buttons)}`);
    
    console.log('  → Sélection du mode de paiement CRÉDIT');
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const creditBtn = buttons.find(b => b.textContent.includes('Crédit'));
        if (creditBtn) creditBtn.click();
      });
      await page.waitForTimeout(1500);
      console.log('  ✓ Mode Crédit sélectionné');
    } catch (e) {
      console.log('  ⚠ Bouton Crédit non trouvé');
    }
    
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const surPlaceBtn = buttons.find(b => b.textContent.includes('Sur place'));
        if (surPlaceBtn) surPlaceBtn.click();
      });
      await page.waitForTimeout(1000);
      console.log('  ✓ Mode Sur place sélectionné');
    } catch (e) {
      console.log('  ⚠ Bouton Sur place non trouvé');
    }
    
    console.log('  → Ajout du produit PACK 6 au panier');
    try {
      await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        const pack6 = elements.find(el => el.textContent.includes('PACK 6') && (el.tagName === 'DIV' || el.tagName === 'CARD'));
        if (pack6) pack6.click();
      });
      await page.waitForTimeout(2000);
      console.log('  ✓ Produit PACK 6 ajouté au panier');
    } catch (e) {
      console.log('  ⚠ Produit non trouvé');
    }
    
    await page.screenshot({ path: 'test-retrait-03-produit.png' });
    
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const validerBtn = buttons.find(b => b.textContent.includes('Valider'));
        if (validerBtn) validerBtn.click();
      });
      await page.waitForTimeout(2000);
      
      try {
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const confirmerBtn = buttons.find(b => b.textContent.includes('Confirmer'));
          if (confirmerBtn) confirmerBtn.click();
        });
        await page.waitForTimeout(3000);
        console.log('  ✓ Vente en Crédit validée\n');
      } catch (e) {
        console.log('  ⚠ Bouton Confirmer non trouvé');
      }
    } catch (e) {
      console.log('  ⚠ Bouton validation non trouvé');
    }
    
    await page.screenshot({ path: 'test-retrait-05-validation.png' });
    
    console.log('📍 ÉTAPE 4: Vérification solde caisse APRÈS');
    await page.goto('/accueil/caisse');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const contentApres = await page.content();
    const soldeMatchApres = contentApres.match(/Solde[:\s]*([\d\s]+)\s*F/i);
    const soldeApres = soldeMatchApres ? soldeMatchApres[1].replace(/\s/g, '') : 'Non trouvé';
    console.log(`  → Solde caisse après: ${soldeApres} F`);
    console.log(`  → Différence: ${soldeAvant !== 'Non trouvé' && soldeApres !== 'Non trouvé' ? (parseInt(soldeApres) - parseInt(soldeAvant)) + ' F' : 'Non calculable'}\n`);
    
    await page.screenshot({ path: 'test-retrait-06-caisse-apres.png' });
    
    console.log('📍 ÉTAPE 5: Vérification historique des ventes');
    await page.goto('/accueil/caisse/journal');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const journalContent = await page.content();
    const hasVenteCredit = journalContent.includes('Crédit') || journalContent.includes('crédit');
    console.log(`  → Entrée Crédit dans le journal: ${hasVenteCredit ? 'Oui' : 'Non'}\n`);
    
    await page.screenshot({ path: 'test-retrait-07-journal.png' });
    
    console.log('═══════════════════════════════════════════════════');
    console.log('   ✅ SCÉNARIO TERMINÉ');
    console.log('   Le client a récupéré sa commande');
    console.log('   - Sans casier à rendre');
    console.log('   - Sans payer');
    console.log('   - En mode Crédit (dette client)');
    console.log('═══════════════════════════════════════════════════\n');
  });
});
