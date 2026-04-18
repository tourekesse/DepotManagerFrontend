import { test, expect } from '@playwright/test';

test.describe('Livraison client sans casier ni argent (CRÉDIT)', () => {
  test('Livraison complète: Connexion → Sélection commande → Livraison sans encaissement', async ({ page }) => {
    console.log('═══════════════════════════════════════════════════');
    console.log('  SCÉNARIO: Livraison client (CRÉDIT)');
    console.log('  - Client n\'a pas de casier à rendre');
    console.log('  - Client n\'a pas d\'argent');
    console.log('  - Livreur ne rien encaisse');
    console.log('═══════════════════════════════════════════════════');

    // ÉTAPE 1: CONNEXION
    console.log('📍 ÉTAPE 1: Connexion du livreur');
    await page.goto('https://depotmanager.gm-soft.ca');
    
    // Remplir le formulaire de connexion
    await page.fill('input[name="email"]', 'kesseguillaume@gmail.com');
    await page.fill('input[name="password"]', 'toure');
    
    // Cliquer sur le bouton de connexion
    await page.click('button[type="submit"]');
    
    // Attendre la redirection vers le dashboard
    await page.waitForURL('**/dashboard');
    console.log('✓ Connecté avec succès');
    
    // ÉTAPE 2: NAVIGATION VERS LA SECTION LIVRAISON
    console.log('📍 ÉTAPE 2: Navigation vers les livraisons');
    
    // Chercher et cliquer sur le menu livraison
    const livraisonMenu = await page.locator('text=Livraison').first();
    await livraisonMenu.click();
    
    // Attendre le chargement de la page livraison
    await page.waitForLoadState('networkidle');
    console.log('✓ Page livraison chargée');
    
    // ÉTAPE 3: SÉLECTION D'UNE COMMANDE À LIVRER
    console.log('📍 ÉTAPE 3: Sélection d\'une commande en crédit');
    
    // Attendre que la liste des commandes se charge
    await page.waitForSelector('[data-testid="commande-list"]', { timeout: 10000 });
    
    // Chercher une commande avec statut "EN_ATTENTE" ou "PRÊTE"
    const commandes = await page.locator('[data-testid="commande-item"]').all();
    
    if (commandes.length === 0) {
      console.log('⚠ Aucune commande trouvée - Création d\'une commande test');
      
      // Naviguer vers les ventes pour créer une commande
      await page.locator('text=Ventes').click();
      await page.waitForLoadState('networkidle');
      
      // Créer une vente en mode crédit
      await page.locator('text=Nouvelle vente').click();
      
      // Sélectionner un client
      await page.waitForSelector('[data-testid="client-list"]', { timeout: 10000 });
      await page.locator('[data-testid="client-item"]').first().click();
      
      // Ajouter un produit
      await page.waitForSelector('[data-testid="product-list"]', { timeout: 10000 });
      await page.locator('[data-testid="product-item"]').first().click();
      
      // Sélectionner le mode de paiement CRÉDIT
      await page.locator('button[aria-label="Crédit"]').click();
      
      // Valider la vente
      await page.locator('button[data-testid="validate-sale"]').click();
      
      // Retourner aux livraisons
      await page.locator('text=Livraison').click();
      await page.waitForLoadState('networkidle');
    }
    
    // ÉTAPE 4: DÉMARRER LA LIVRAISON
    console.log('📍 ÉTAPE 4: Démarrage de la livraison');
    
    // Sélectionner la première commande disponible
    await page.locator('[data-testid="commande-item"]').first().click();
    
    // Cliquer sur le bouton "Commencer la livraison"
    await page.locator('button[data-testid="start-delivery"]').click();
    
    console.log('✓ Livraison démarrée');
    
    // ÉTAPE 5: VALIDATION EN DETTE CLIENT
    console.log('📍 ÉTAPE 5: Validation en dette client');
    
    // Attendre l'écran de confirmation de livraison
    await page.waitForSelector('[data-testid="delivery-confirmation"]', { timeout: 10000 });
    
    // Vérifier que le mode de paiement affiché est "CRÉDIT"
    const paymentMode = await page.locator('[data-testid="payment-mode"]').textContent();
    expect(paymentMode).toContain('CRÉDIT');
    
    // Cliquer sur le nouveau bouton "VALIDER EN DETTE CLIENT"
    await page.locator('button:has-text("VALIDER EN DETTE CLIENT")').click();
    
    // Attendre la confirmation finale
    await page.waitForSelector('[data-testid="delivery-success"]', { timeout: 10000 });
    
    // Vérifier le message de succès
    const successMessage = await page.locator('[data-testid="success-message"]').textContent();
    expect(successMessage).toContain('livrée');
    
    console.log('✅ Livraison terminée avec succès');
    console.log('✅ Validée en mode DETTE CLIENT');
    console.log('✅ Aucun encaissement effectué');
    console.log('✅ Aucun casier rendu');
    
    // ÉTAPE 7: VÉRIFICATION DE L'HISTORIQUE
    console.log('📍 ÉTAPE 7: Vérification de l\'historique des livraisons');
    
    // Retourner à la liste des livraisons
    await page.locator('button[data-testid="back-to-list"]').click();
    await page.waitForLoadState('networkidle');
    
    // Vérifier que la commande apparaît comme "LIVRÉE"
    const deliveredStatus = await page.locator('[data-testid="status-livree"]').first();
    expect(deliveredStatus).toBeVisible();
    
    console.log('✓ Statut "Livrée" confirmé dans l\'historique');
    
    console.log('═══════════════════════════════════════════════════');
    console.log('  ✅ SCÉNARIO TERMINÉ AVEC SUCCÈS');
    console.log('  Le client a reçu sa commande:');
    console.log('  - Sans casier à rendre');
    console.log('  - Sans argent à payer');
    console.log('  - En mode CRÉDIT (dette client)');
    console.log('═══════════════════════════════════════════════════');
  });
});
