const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const BASE_URL = 'https://depotmanager.gm-soft.ca';
const EMAIL = 'kesseguillaume@gmail.com';
const PASSWORD = 'toure';

let driver;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(name) {
  try {
    const screenshot = await driver.takeScreenshot();
    require('fs').writeFileSync(`selenium-${name}.png`, screenshot, 'base64');
    console.log(`  📸 Screenshot: selenium-${name}.png`);
  } catch (e) {}
}

async function initDriver() {
  const options = new chrome.Options();
  options.addArguments('--start-maximized');
  options.addArguments('--disable-blink-features=AutomationControlled');
  options.setAcceptInsecureCerts(true);
  
  driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  return driver;
}

async function login() {
  console.log('\n=== ÉTAPE 1: CONNEXION ===');
  await driver.get(`${BASE_URL}/login`);
  await sleep(3000);
  
  const emailInput = await driver.wait(until.elementLocated(By.css('input[type="email"]')), 15000);
  await emailInput.sendKeys(EMAIL);
  
  const passwordInput = await driver.findElement(By.css('input[type="password"]'));
  await passwordInput.sendKeys(PASSWORD);
  
  const submitButton = await driver.findElement(By.css('button[type="submit"]'));
  await submitButton.click();
  
  await driver.wait(until.urlContains('/accueil'), 60000);
  console.log('  ✓ Connecté');
  await takeScreenshot('01-login');
}

async function allerVente() {
  console.log('\n=== ÉTAPE 2: PAGE VENTE ===');
  await driver.get(`${BASE_URL}/accueil/ventes/nouveau`);
  await sleep(5000);
  console.log('  ✓ Page chargée');
  await takeScreenshot('02-page-vente');
}

async function choisirClient() {
  console.log('\n=== ÉTAPE 3: CLIENT ===');
  await sleep(2000);
  
  try {
    const clientSelect = await driver.findElement(By.xpath('//select[contains(@class, "MuiNativeSelect")]'));
    await clientSelect.click();
    await sleep(1500);
    
    const options = await driver.findElements(By.xpath('//option'));
    if (options.length > 1) {
      await options[1].click();
      await sleep(1000);
      console.log('  ✓ Client sélectionné');
    }
  } catch (e) {
    console.log('  ⚠ Erreur:', e.message);
  }
  
  await takeScreenshot('03-client');
}

async function ajouterProduits(nomsProduits) {
  console.log('\n=== ÉTAPE 4: PRODUITS ===');
  
  for (const nom of nomsProduits) {
    console.log(`\n  → Ajout: ${nom}`);
    await sleep(1500);
    
    try {
      const searchInput = await driver.findElement(By.xpath('//input[contains(@placeholder, "Rechercher")]'));
      await searchInput.clear();
      await searchInput.sendKeys(nom);
      await sleep(2000);
      
      const ajouterBtn = await driver.findElement(By.xpath('//button[contains(text(), "Ajouter")]'));
      await ajouterBtn.click();
      await sleep(1500);
      console.log(`  ✓ ${nom} ajouté`);
      
      await searchInput.clear();
      await sleep(500);
    } catch (e) {
      console.log(`  ⚠ Erreur: ${e.message}`);
    }
    
    await takeScreenshot(`04-${nom.replace(/\s/g, '-')}`);
  }
}

async function validerVente() {
  console.log('\n=== ÉTAPE 5: VALIDATION ===');
  
  await sleep(3000);
  
  // Vérifier si le panier est déjà ouvert (visible en bas de l'écran)
  const cartAlreadyOpen = await driver.findElements(By.xpath('//button[contains(text(), "Valider")]')).catch(() => []);
  
  if (cartAlreadyOpen.length > 0) {
    console.log('  → Panier déjà ouvert');
    try {
      const validerBtn = await driver.findElement(By.xpath('//button[contains(text(), "Valider")]'));
      await validerBtn.click();
      await sleep(2000);
      console.log('  ✓ Validation cliquée');
    } catch (e) {
      console.log('  ⚠ Clic validation:', e.message);
    }
  } else {
    // Ouvrir le panier
    try {
      const panierBtn = await driver.findElement(By.xpath('//button[.//span[text()="Panier"]]'));
      await panierBtn.click();
      await sleep(2000);
      console.log('  ✓ Panier ouvert');
    } catch (e) {
      console.log('  ⚠ Ouvrir panier:', e.message);
    }
    
    // Valider
    try {
      const validerBtn = await driver.findElement(By.xpath('//button[contains(text(), "Valider")]'));
      await validerBtn.click();
      await sleep(2000);
      console.log('  ✓ Validation cliquée');
    } catch (e) {
      console.log('  ⚠ Clic:', e.message);
    }
  }
  
  await takeScreenshot('05-validation');
  
  // Confirmer
  try {
    const confirmer = await driver.findElement(By.xpath('//button[contains(text(), "Confirmer")]'));
    await confirmer.click();
    await sleep(3000);
    console.log('  ✓ Vente confirmée!');
  } catch (e) {
    console.log('  ⚠ Confirmer:', e.message);
  }
  
  await takeScreenshot('06-termine');
}

async function verifierCaisse() {
  console.log('\n=== ÉTAPE 6: CAISSE ===');
  await driver.get(`${BASE_URL}/accueil/caisse/journal`);
  await sleep(4000);
  console.log('  ✓ Caisse chargée');
  await takeScreenshot('07-caisse');
}

async function verifierClients() {
  console.log('\n=== ÉTAPE 7: CLIENTS ===');
  await driver.get(`${BASE_URL}/accueil/clients`);
  await sleep(4000);
  console.log('  ✓ Clients chargée');
  await takeScreenshot('08-clients');
}

async function runTest() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   TEST SELENIUM COMPLET');
  console.log('═══════════════════════════════════════════════════');
  
  try {
    await initDriver();
    
    await login();
    await allerVente();
    await choisirClient();
    await ajouterProduits(['Castel 33cl']);
    await validerVente();
    await verifierCaisse();
    await verifierClients();
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('   ✅ TEST TERMINÉ');
    console.log('═══════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    await takeScreenshot('error');
  } finally {
    await sleep(5000);
    if (driver) {
      await driver.quit();
    }
  }
}

runTest();
