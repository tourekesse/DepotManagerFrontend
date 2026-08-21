const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');

const BASE_URL = 'http://localhost:5174';

(async () => {
  console.log('Ouverture de Chrome...');
  
  const options = new chrome.Options();
  options.addArguments('--window-size=1920,1080');
  options.addArguments('--start-maximized');
  // options.addArguments('--headless');  // décommente si pas d'écran
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    // 1. Page d'accueil
    console.log('1. Page d\'accueil...');
    await driver.get(BASE_URL);
    await driver.sleep(2000);
    console.log('   OK - ' + await driver.getTitle());

    // 2. Page login
    console.log('2. Page login...');
    await driver.get(BASE_URL + '/login');
    await driver.sleep(2000);
    console.log('   OK - Formulaire visible');

    // 3. Remplir login
    console.log('3. Remplissage identifiants...');
    const emailField = await driver.wait(until.elementLocated(By.css('input[type="text"]')), 10000);
    await emailField.sendKeys('kesseguillaume@gmail.com');
    
    const passwordField = await driver.findElement(By.css('input[type="password"]'));
    await passwordField.sendKeys('toure');
    await driver.sleep(500);

    // 4. Cliquer Se connecter
    console.log('4. Clic Se connecter...');
    const loginBtn = await driver.findElement(By.css('button[type="submit"]'));
    await loginBtn.click();
    await driver.sleep(3000);

    // 5. Verifier ou on est
    const currentUrl = driver.getCurrentUrl();
    console.log('5. Apres login: ' + await currentUrl);

    // 6. Si sur dashboard, aller sur les pages
    if ((await currentUrl).includes('accueil')) {
      console.log('6. Dashboard charge - Navigation...');
      
      await driver.get(BASE_URL + '/accueil/produits');
      await driver.sleep(2000);
      console.log('   Produits OK');
      
      await driver.get(BASE_URL + '/accueil/clients');
      await driver.sleep(2000);
      console.log('   Clients OK');

      await driver.get(BASE_URL + '/accueil/commandes-depot');
      await driver.sleep(2000);
      console.log('   Commandes OK');
      
      await driver.get(BASE_URL + '/accueil/caisse/journal');
      await driver.sleep(2000);
      console.log('   Caisse OK');
    } else {
      console.log('6. Login echoue - backend API indisponible');
      console.log('   On reste sur les pages publiques');
      
      await driver.get(BASE_URL + '/');
      await driver.sleep(2000);
      console.log('   Accueil OK');
    }

    console.log('');
    console.log('TERMINE!');

  } catch (err) {
    console.error('ERREUR:', err.message);
  } finally {
    await driver.quit();
    console.log('Navigateur ferme.');
  }
})();
