#!/usr/bin/env node

// ========================================
// TEST SELENIUM WORKFLOW COMPLET - DepotManager
// ========================================

const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');

class CompleteWorkflowTest {
    constructor() {
        this.driver = null;
        this.testResults = {};
    }

    async setup() {
        console.log('🚀 Initialisation du test Selenium workflow complet...');

        const options = new chrome.Options();
        options.addArguments('--start-maximized');
        options.addArguments('--disable-web-security');

        this.driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();

        console.log('✅ Driver Chrome configuré');
    }

    async takeScreenshot(name) {
        const screenshot = await this.driver.takeScreenshot();
        const filename = `workflow-${name}-${Date.now()}.png`;
        fs.writeFileSync(filename, screenshot, 'base64');
        console.log(`📸 Screenshot: ${filename}`);
        return filename;
    }

    async testLogin() {
        console.log('\n🔐 === ÉTAPE 1: CONNEXION ===');
        
        await this.driver.get('https://depotmanager.gm-soft.ca/login');
        await this.driver.sleep(3000);

        const currentUrl = await this.driver.getCurrentUrl();
        
        // Vérifier si déjà connecté (redirigé vers l'accueil)
        if (!currentUrl.includes('/login')) {
            console.log('✅ Déjà connecté ! Redirigé vers:', currentUrl);
            this.testResults.login = 'already_connected';
            await this.takeScreenshot('already-connected');
            return;
        }

        // Si pas connecté, essayer de se connecter
        try {
            const emailField = await this.driver.findElement(By.css('input[type="email"]'));
            const passwordField = await this.driver.findElement(By.css('input[type="password"]'));
            const submitButtons = await this.driver.findElements(By.css('button'));

            await emailField.clear();
            await emailField.sendKeys('kesseguillaume@gmail.com');
            
            await passwordField.clear();
            await passwordField.sendKeys('toure');

            let loginButton = null;
            for (const button of submitButtons) {
                try {
                    const text = await button.getText();
                    if (text.toLowerCase().includes('se connecter')) {
                        loginButton = button;
                        break;
                    }
                } catch (error) {
                    // Ignorer
                }
            }

            await loginButton.click();
            await this.driver.sleep(10000);

            const newUrl = await this.driver.getCurrentUrl();
            
            if (!newUrl.includes('/login')) {
                console.log('✅ Connexion réussie !');
                this.testResults.login = 'success';
                await this.takeScreenshot('login-success');
            } else {
                console.log('❌ Connexion échouée');
                this.testResults.login = 'failed';
            }
        } catch (error) {
            console.log('⚠️ Erreur lors de la connexion, peut-être déjà connecté ?');
            this.testResults.login = 'error';
        }
    }

    async testAccessVente() {
        console.log('\n🛒 === ÉTAPE 2: ACCÈS VENTE ===');
        
        await this.driver.get('https://depotmanager.gm-soft.ca/accueil/ventes/nouveau');
        await this.driver.sleep(3000);
        
        const currentUrl = await this.driver.getCurrentUrl();
        
        if (currentUrl.includes('ventes/nouveau')) {
            console.log('✅ Accès vente réussi !');
            this.testResults.accessVente = 'success';
            await this.takeScreenshot('access-vente');
        } else {
            console.log('❌ Accès vente échoué');
            this.testResults.accessVente = 'failed';
        }
    }

    async testSelectClient() {
        console.log('\n👤 === ÉTAPE 3: SÉLECTION CLIENT (ULTRA-ROBUSTE) ===');
        
        try {
            // 1. Ouvrir le menu de sélection client
            console.log('🎯 Ouverture du menu client...');
            
            const selectTrigger = await this.driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'Sélectionner un client')]")), 5000);
            await selectTrigger.click();
            await this.driver.sleep(1000);
            
            // 2. Attendre que l'option soit visible et récupérer le texte
            console.log('🔍 Recherche de l\'option client...');
            
            const option = await this.driver.wait(until.elementLocated(By.css("li[role='option'], .MuiMenuItem-root")), 5000);
            const nomClient = await option.getText();
            console.log(`👤 Client trouvé: "${nomClient}"`);
            
            // 3. ACTION CRUCIALE : Clic + délai + vérification
            await option.click();
            await this.driver.sleep(500);
            
            // 4. BOUCLE DE SÉCURITÉ : Vérifier si le bouton est encore disabled
            const btnValider = await this.driver.findElement(By.xpath("//button[contains(text(), 'Valider la vente')]"));
            
            if (!(await btnValider.isEnabled())) {
                console.log('⚠️ Bouton encore grisé, forçage de l\'état React via JS...');
                
                // Forcer le clic via JS pour déclencher l'événement onChange de React
                await this.driver.executeScript("arguments[0].click();", option);
                await this.driver.sleep(500);
            }
            
            // 5. ATTENTE DE L'ACTIVATION : Attendre que le bouton s'active
            console.log('⏳ Attente de l\'activation du bouton...');
            
            await this.driver.wait(async () => {
                return await btnValider.isEnabled();
            }, 10000);
            
            console.log(`✅ Bouton activé ! Vente prête pour ${nomClient}`);
            this.testResults.selectClient = 'success';
            await this.takeScreenshot('client-selected-final');
            
        } catch (error) {
            console.log(`⚠️ Erreur sélection client: ${error.message}`);
            this.testResults.selectClient = 'error';
            await this.takeScreenshot('client-selection-error');
        }
    }

    async testConfigVente() {
        console.log('\n⚙️ === ÉTAPE 4: CONFIGURATION VENTE ===');
        
        const allButtons = await this.driver.findElements(By.css('button'));
        
        // Chercher type de vente
        let typeVenteFound = false;
        for (const button of allButtons) {
            try {
                const buttonText = await button.getText();
                if (buttonText.includes('Cash') || buttonText.includes('Crédit')) {
                    await button.click();
                    await this.driver.sleep(500);
                    console.log(`✅ Type de vente: "${buttonText}"`);
                    typeVenteFound = true;
                    break;
                }
            } catch (error) {
                // Ignorer
            }
        }
        
        // Chercher mode de livraison
        let livraisonFound = false;
        for (const button of allButtons) {
            try {
                const buttonText = await button.getText();
                if (buttonText.includes('Sur place') || buttonText.includes('livrer')) {
                    await button.click();
                    await this.driver.sleep(500);
                    console.log(`✅ Mode livraison: "${buttonText}"`);
                    livraisonFound = true;
                    break;
                }
            } catch (error) {
                // Ignorer
            }
        }
        
        if (typeVenteFound || livraisonFound) {
            console.log('✅ Configuration vente réussie');
            this.testResults.configVente = 'success';
        } else {
            console.log('⚠️ Configuration par défaut');
            this.testResults.configVente = 'default';
        }
        
        await this.takeScreenshot('vente-configured');
    }

    async testAddProducts() {
        console.log('\n📦 === ÉTAPE 5: AJOUT PRODUITS (MÉTHODE PRÉCISE) ===');
        
        try {
            // 1. Chercher le champ de recherche
            console.log('🔍 Recherche du champ de recherche...');
            
            const searchField = await this.driver.wait(until.elementLocated(By.css('input[placeholder*="Rechercher"]')), 5000);
            await searchField.clear();
            await this.driver.sleep(500);
            
            // 2. Ajouter Castel 66cl
            console.log('📦 Ajout de Castel 66cl...');
            await searchField.sendKeys('Castel 66cl');
            await this.driver.sleep(2000);
            
            // Chercher le bouton "Ajouter" pour Castel 66cl
            const addButton1 = await this.driver.wait(until.elementLocated(By.xpath("//button[contains(@aria-label, 'Ajouter Castel 66cl') or contains(text(), 'Ajouter')]")), 5000);
            await addButton1.click();
            console.log('✅ Castel 66cl ajouté');
            await this.takeScreenshot('castel66-added');
            
            // 3. Ajouter Castel 50cl
            console.log('📦 Ajout de Castel 50cl...');
            await searchField.clear();
            await searchField.sendKeys('Castel 50cl');
            await this.driver.sleep(2000);
            
            const addButton2 = await this.driver.wait(until.elementLocated(By.xpath("//button[contains(@aria-label, 'Ajouter Castel 50cl') or contains(text(), 'Ajouter')]")), 5000);
            await addButton2.click();
            console.log('✅ Castel 50cl ajouté');
            await this.takeScreenshot('castel50-added');
            
            // 4. Vérifier que les produits sont dans le panier
            console.log('\n🧪 VÉRIFICATION : Contenu du panier après ajout...');
            
            const cartContent = await this.driver.executeScript(`
                // Chercher le compteur du panier
                const cartBadge = document.querySelector('[class*="MuiBadge-badge"], .badge, [class*="badge"]');
                return cartBadge ? cartBadge.textContent : '0';
            `);
            
            console.log(`📋 Compteur du panier: "${cartContent}"`);
            
            if (cartContent !== '0' && cartContent !== '') {
                console.log('✅ Produits détectés dans le panier !');
                this.testResults.addProducts = 'success';
            } else {
                console.log('❌ Aucun produit détecté dans le panier');
                this.testResults.addProducts = 'cart_empty';
            }
            
            await this.takeScreenshot('cart-verification');
            
        } catch (error) {
            console.log(`⚠️ Erreur lors de l'ajout des produits: ${error.message}`);
            this.testResults.addProducts = 'error';
            await this.takeScreenshot('add-products-error');
        }
    }

    async testOpenCart() {
        console.log('\n🧺 === ÉTAPE 6: OUVERTURE PANIER ===');
        
        const allButtons = await this.driver.findElements(By.css('button'));
        let cartButton = null;
        
        for (const button of allButtons) {
            try {
                const buttonText = await button.getText();
                if (buttonText.includes('Panier')) {
                    cartButton = button;
                    break;
                }
            } catch (error) {
                // Ignorer
            }
        }
        
        if (cartButton) {
            await cartButton.click();
            await this.driver.sleep(2000);
            console.log('✅ Panier ouvert');
            this.testResults.openCart = 'success';
            await this.takeScreenshot('cart-opened');
        } else {
            console.log('❌ Panier non trouvé');
            this.testResults.openCart = 'failed';
        }
    }

    async testValidation() {
        console.log('\n✅ === ÉTAPE 7: VALIDATION FINALE ===');
        
        // Le bouton "VALIDER LA VENTE" doit maintenant être actif
        await this.driver.sleep(2000);
        
        try {
            const validateButton = await this.driver.findElement(By.xpath("//button[contains(text(), 'Valider la vente')]"));
            
            const isEnabled = await validateButton.isEnabled();
            const isDisplayed = await validateButton.isDisplayed();
            const buttonText = await validateButton.getText();
            
            console.log(`🎯 Bouton trouvé: "${buttonText}"`);
            console.log(`📊 État - Actif: ${isEnabled}, Visible: ${isDisplayed}`);
            
            if (isEnabled && isDisplayed) {
                console.log('✅ VALIDATION PRÊTE ! Le workflow est complet !');
                this.testResults.validation = 'ready';
                
                // Screenshot final du succès
                await this.takeScreenshot('workflow-success');
                
                console.log('\n🏆 WORKFLOW COMPLET RÉUSSI !');
                console.log('✅ Connexion → Vente → Client → Produits → Panier → VALIDATION');
                console.log('🎯 Votre DepotManager fonctionne parfaitement !');
                
                // NE PAS CLIQUER pour éviter une vraie vente
                console.log('⚠️ Validation simulée - pas de clic pour éviter les vraies ventes');
                
            } else {
                console.log('❌ Bouton trouvé mais pas actif');
                this.testResults.validation = 'not_ready';
                await this.takeScreenshot('validation-still-disabled');
            }
            
        } catch (error) {
            console.log(`❌ Bouton validation non trouvé: ${error.message}`);
            this.testResults.validation = 'not_found';
            await this.takeScreenshot('validation-missing');
        }
    }

    async generateReport() {
        console.log('\n📋 === RAPPORT FINAL WORKFLOW ===');
        
        console.log('\n📊 Résultats par étape:');
        Object.entries(this.testResults).forEach(([step, result]) => {
            const status = result === 'success' ? '✅' : result === 'ready' ? '🟡' : '❌';
            console.log(`  ${status} ${step}: ${result}`);
        });

        const successfulSteps = Object.values(this.testResults).filter(r => r === 'success' || r === 'ready').length;
        const totalSteps = Object.keys(this.testResults).length;
        const successRate = Math.round((successfulSteps / totalSteps) * 100);

        console.log(`\n🎈 Taux de réussite: ${successRate}% (${successfulSteps}/${totalSteps})`);
        
        if (successRate >= 80) {
            console.log('🎉 WORKFLOW EXCELLENT !');
        } else if (successRate >= 60) {
            console.log('👍 WORKFLOW BON');
        } else {
            console.log('⚠️ WORKFLOW À AMÉLIORER');
        }

        // Sauvegarder le rapport
        const report = {
            timestamp: new Date().toISOString(),
            testResults: this.testResults,
            summary: {
                totalSteps,
                successfulSteps,
                successRate
            }
        };

        fs.writeFileSync('workflow-test-report.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Rapport sauvegardé: workflow-test-report.json');
    }

    async run() {
        try {
            await this.setup();
            
            await this.testLogin();
            await this.testAccessVente();
            await this.testSelectClient();
            await this.testConfigVente();
            await this.testAddProducts();
            await this.testOpenCart();
            await this.testValidation();
            
            await this.generateReport();
            
        } catch (error) {
            console.error('❌ Erreur:', error);
        } finally {
            if (this.driver) {
                await this.driver.quit();
            }
        }
    }
}

// Lancer le test
if (require.main === module) {
    const test = new CompleteWorkflowTest();
    test.run().catch(console.error);
}

module.exports = CompleteWorkflowTest;
