const { chromium } = require('playwright');
const path = require('path');

async function recordDemo() {
  const browser = await chromium.launch({ 
    headless: false, 
    args: ['--start-maximized', '--disable-infobars', '--disable-extensions', '--window-position=4000,4000'] 
  });
  
  const context = await browser.newContext({ 
    viewport: { width: 1280, height: 720 },
    recordVideo: { 
      dir: 'public/videos/', 
      size: { width: 1280, height: 720 },
      scale: 1
    },
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();

  try {
    console.log('🎬 Début de l\'enregistrement...');
    
    // D'abord aller sur la page d'accueil
    console.log('🌐 Navigation vers l\'accueil...');
    await page.goto('http://127.0.0.1:5174/', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // Debug: prendre un screenshot pour vérifier le rendu
    await page.screenshot({ path: 'debug-screenshot.png' });
    console.log('📸 Screenshot de debug pris');
    
    // Ajout de l'overlay de branding dès le début
    await page.evaluate(() => {
      const div = document.createElement('div');
      div.innerHTML = 'depotmanager.gm-soft.ca - 14 jours gratuits';
      div.style = 'position:fixed;bottom:10px;right:10px;background:#0b2348;color:white;padding:8px 15px;border-radius:20px;font-family:Inter,z-index:9999;font-weight:600;font-size:14px';
      document.body.appendChild(div);
    });
    
    await page.waitForTimeout(1000);

    // Vérifier si déjà connecté ou besoin de login
    console.log('🔍 Vérification connexion...');
    const emailInput = await page.locator('input[type="email"], input[name="email"]').first();
    const isLoginVisible = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isLoginVisible) {
      console.log('🔐 Connexion requise...');
      await emailInput.fill('gmsoftmanagementsystem@gmail.com');
      
      const passwordInput = await page.locator('input[type="password"], input[name="password"]').first();
      await passwordInput.fill('okokok');
      
      const submitButton = await page.locator('button[type="submit"]').first();
      await submitButton.click();
      
      // Attendre la navigation après login
      console.log('⏳ Attente après login...');
      await page.waitForNavigation({ timeout: 15000 });
      await page.waitForTimeout(2000);
    } else {
      console.log('✅ Déjà connecté');
      await page.waitForTimeout(1000);
    }
    
    // Navigation vers la page de création produit
    console.log('📝 Navigation vers création produit...');
    await page.goto('http://127.0.0.1:5174/accueil/produits/nouveau', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Sélectionner l'onglet "Ajout classique" si nécessaire
    console.log('🔄 Vérification de l\'onglet...');
    const classiqueTab = await page.locator('text=Ajout classique').first();
    if (await classiqueTab.isVisible({ timeout: 5000 })) {
      await classiqueTab.click();
      await page.waitForTimeout(1000);
    }

    // Remplissage du formulaire avec délai humain
    console.log('✍️ Remplissage du formulaire...');
    
    // Unité: Bouteille
    const uniteSelect = await page.locator('select[name="uniteVenteParDefautId"]').first();
    if (await uniteSelect.isVisible({ timeout: 5000 })) {
      await uniteSelect.click();
      await page.waitForTimeout(300);
      await uniteSelect.selectOption('2'); // Bouteille
      await page.waitForTimeout(500);
    }
    
    // Marque: Ivorio
    const marqueInput = await page.locator('input[placeholder*="marque" i], input[name="marque"]').first();
    if (await marqueInput.isVisible({ timeout: 5000 })) {
      await marqueInput.click();
      await marqueInput.type('Ivorio', { delay: 100 });
      await page.waitForTimeout(500);
    }
    
    // Saveur: Mangue
    const varianteInput = await page.locator('input[name="variante"]').first();
    if (await varianteInput.isVisible({ timeout: 5000 })) {
      await varianteInput.click();
      await varianteInput.type('Mangue', { delay: 100 });
      await page.waitForTimeout(500);
    }
    
    // Format: 33cl
    const formatInput = await page.locator('input[placeholder*="format" i], input[name="format"]').first();
    if (await formatInput.isVisible({ timeout: 5000 })) {
      await formatInput.click();
      await formatInput.type('33cl', { delay: 100 });
      await page.waitForTimeout(500);
    }
    
    // Groupe liquide: JUS
    const groupeSelect = await page.locator('select[name="groupeLiquide"]').first();
    if (await groupeSelect.isVisible({ timeout: 5000 })) {
      await groupeSelect.click();
      await page.waitForTimeout(300);
      await groupeSelect.selectOption('JUS');
      await page.waitForTimeout(500);
    }
    
    // Bouteilles par casier: 24
    const casierInput = await page.locator('input[name="nbreBouteillesParCasier"]').first();
    if (await casierInput.isVisible({ timeout: 5000 })) {
      await casierInput.click();
      await casierInput.type('24', { delay: 100 });
      await page.waitForTimeout(500);
    }
    
    // Prix achat: 7200
    const prixAchatInput = await page.locator('input[name="prixAchatHt"]').first();
    if (await prixAchatInput.isVisible({ timeout: 5000 })) {
      await prixAchatInput.click();
      await prixAchatInput.type('7200', { delay: 100 });
      await page.waitForTimeout(500);
    }
    
    // Prix vente: 500
    const prixVenteInput = await page.locator('input[name="prixVenteHt"]').first();
    if (await prixVenteInput.isVisible({ timeout: 5000 })) {
      await prixVenteInput.click();
      await prixVenteInput.type('500', { delay: 100 });
      await page.waitForTimeout(500);
    }
    
    // Stock initial: 100
    const stockInput = await page.locator('input[name="stockInitial"]').first();
    if (await stockInput.isVisible({ timeout: 5000 })) {
      await stockInput.click();
      await stockInput.type('100', { delay: 100 });
      await page.waitForTimeout(1000);
    }

    // Clic sur Enregistrer
    console.log('💾 Enregistrement du produit...');
    const submitBtn = await page.locator('button[type="submit"], button:has-text("Enregistrer")').first();
    if (await submitBtn.isVisible({ timeout: 5000 })) {
      await submitBtn.click();
    }
    
    // Attendre le toast de succès
    console.log('⏳ Attente du message de succès...');
    await page.waitForTimeout(3000);
    
    console.log('✅ Enregistrement terminé avec succès!');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await context.close();
    await browser.close();
    
    console.log('🎥 Vidéo sauvegardée dans public/videos/');
  }
}

recordDemo();