#!/usr/bin/env node

// ========================================
// TEST SELENIUM INTERACTIF - DepotManager
// ========================================

const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');

class InteractiveDepotManagerTest {
    constructor() {
        this.driver = null;
        this.currentModule = 'login';
        this.improvements = [];
        this.testResults = {};
    }

    async setup() {
        console.log('🚀 Initialisation du test Selenium interactif...');

        const options = new chrome.Options();
        options.addArguments('--start-maximized');
        options.addArguments('--disable-web-security');

        this.driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();

        console.log('✅ Driver Chrome configuré');
    }

    async takeScreenshot(moduleName) {
        const screenshot = await this.driver.takeScreenshot();
        const filename = `test-${moduleName}-${Date.now()}.png`;
        fs.writeFileSync(filename, screenshot, 'base64');
        console.log(`📸 Screenshot: ${filename}`);
        return filename;
    }

    async analyzeCurrentPage(moduleName) {
        console.log(`\n🔍 Analyse du module: ${moduleName}`);
        
        // Prendre screenshot
        await this.takeScreenshot(moduleName);

        // Analyser la structure de la page
        const pageAnalysis = await this.driver.executeScript(`
            return {
                title: document.title,
                url: window.location.href,
                forms: Array.from(document.querySelectorAll('form')).length,
                inputs: Array.from(document.querySelectorAll('input')).length,
                buttons: Array.from(document.querySelectorAll('button')).length,
                hasNavigation: document.querySelectorAll('nav, .nav, .menu, .sidebar').length > 0,
                hasCart: document.querySelectorAll('.cart, .panier, .basket').length > 0,
                hasProductList: document.querySelectorAll('.product, .item, .card').length > 0
            };
        `);

        console.log('📊 Analyse structurelle:');
        console.log(`  - Titre: ${pageAnalysis.title}`);
        console.log(`  - URL: ${pageAnalysis.url}`);
        console.log(`  - Formulaires: ${pageAnalysis.forms}`);
        console.log(`  - Champs input: ${pageAnalysis.inputs}`);
        console.log(`  - Boutons: ${pageAnalysis.buttons}`);
        console.log(`  - Navigation: ${pageAnalysis.hasNavigation ? '✅' : '❌'}`);
        console.log(`  - Panier: ${pageAnalysis.hasCart ? '✅' : '❌'}`);
        console.log(`  - Liste produits: ${pageAnalysis.hasProductList ? '✅' : '❌'}`);

        return pageAnalysis;
    }

    async testLogin() {
        console.log('\n🔐 === MODULE 1: CONNEXION ===');
        
        await this.driver.get('https://depotmanager.gm-soft.ca/login');
        await this.analyzeCurrentPage('login');

        // Attendre le chargement
        await this.driver.sleep(2000);

        // Analyser les champs de connexion
        const loginFields = await this.driver.findElements(By.css('input[type="email"], input[type="text"], input[name*="email"], input[placeholder*="email"]'));
        const passwordFields = await this.driver.findElements(By.css('input[type="password"], input[name*="password"], input[placeholder*="password"]'));
        const submitButtons = await this.driver.findElements(By.css('button[type="submit"], button:contains("Connexion"), button:contains("Login"), input[type="submit"]'));

        console.log('\n🔍 Éléments de connexion trouvés:');
        console.log(`  - Champs email: ${loginFields.length}`);
        console.log(`  - Champs mot de passe: ${passwordFields.length}`);
        console.log(`  - Boutons soumission: ${submitButtons.length}`);

        // Améliorations suggérées pour le login
        if (loginFields.length === 0) {
            this.improvements.push({
                module: 'login',
                priority: 'high',
                issue: 'Champ email non trouvé',
                suggestion: 'Ajouter un input type="email" avec placeholder="Adresse email"'
            });
        }

        if (passwordFields.length === 0) {
            this.improvements.push({
                module: 'login',
                priority: 'high',
                issue: 'Champ mot de passe non trouvé',
                suggestion: 'Ajouter un input type="password" avec placeholder="Mot de passe"'
            });
        }

        if (submitButtons.length === 0) {
            this.improvements.push({
                module: 'login',
                priority: 'high',
                issue: 'Bouton de connexion non trouvé',
                suggestion: 'Ajouter un bouton type="submit" avec texte "Se connecter"'
            });
        }

        // Tenter la connexion si tous les éléments sont présents
        if (loginFields.length > 0 && passwordFields.length > 0 && submitButtons.length > 0) {
            console.log('\n🚀 Tentative de connexion...');
            
            await loginFields[0].clear();
            await loginFields[0].sendKeys('kesseguillaume@gmail.com');
            
            await passwordFields[0].clear();
            await passwordFields[0].sendKeys('toure');
            
            await submitButtons[0].click();
            
            // Attendre la redirection
            await this.driver.sleep(3000);
            
            const currentUrl = await this.driver.getCurrentUrl();
            console.log(`📍 URL après connexion: ${currentUrl}`);
            
            if (!currentUrl.includes('/login')) {
                console.log('✅ Connexion réussie !');
                this.testResults.login = 'success';
            } else {
                console.log('❌ Connexion échouée');
                this.testResults.login = 'failed';
            }
        } else {
            console.log('❌ Éléments de connexion manquants');
            this.testResults.login = 'failed';
        }

        await this.takeScreenshot('login-result');
    }

    async testDashboard() {
        console.log('\n📊 === MODULE 2: DASHBOARD ===');
        
        await this.analyzeCurrentPage('dashboard');

        // Analyser la navigation
        const navigationElements = await this.driver.findElements(By.css('nav a, .nav a, .menu a, .sidebar a'));
        console.log(`\n🧭 Éléments de navigation trouvés: ${navigationElements.length}`);

        // Lister les options de menu
        const menuItems = [];
        for (let i = 0; i < Math.min(navigationElements.length, 10); i++) {
            try {
                const text = await navigationElements[i].getText();
                const href = await navigationElements[i].getAttribute('href');
                menuItems.push({ text, href });
                console.log(`  - ${text} -> ${href}`);
            } catch (error) {
                // Ignorer les erreurs
            }
        }

        // Améliorations pour le dashboard
        if (navigationElements.length === 0) {
            this.improvements.push({
                module: 'dashboard',
                priority: 'high',
                issue: 'Aucune navigation trouvée',
                suggestion: 'Ajouter un menu de navigation clair avec accès aux fonctionnalités principales'
            });
        }

        // Chercher un lien vers les ventes
        const saleLinks = menuItems.filter(item => 
            item.text.toLowerCase().includes('vente') || 
            item.text.toLowerCase().includes('sale') ||
            item.text.toLowerCase().includes('commande') ||
            item.href && item.href.includes('vente')
        );

        if (saleLinks.length === 0) {
            this.improvements.push({
                module: 'dashboard',
                priority: 'high',
                issue: 'Aucun lien vers les ventes trouvé',
                suggestion: 'Ajouter un lien "Nouvelle Vente" ou "Vendre" dans le menu principal'
            });
        } else {
            console.log(`\n✅ Liens vers ventes trouvés: ${saleLinks.length}`);
            saleLinks.forEach(link => console.log(`  - ${link.text}`));
        }

        this.testResults.dashboard = navigationElements.length > 0 ? 'success' : 'partial';
    }

    async testSalesInterface() {
        console.log('\n💰 === MODULE 3: INTERFACE DE VENTE ===');
        
        // Chercher et cliquer sur un lien de vente
        const saleLinks = await this.driver.findElements(By.css('nav a, .nav a, .menu a'));
        
        let saleLinkClicked = false;
        for (const link of saleLinks) {
            try {
                const text = await link.getText();
                if (text.toLowerCase().includes('vente') || 
                    text.toLowerCase().includes('sale') ||
                    text.toLowerCase().includes('commande')) {
                    await link.click();
                    await this.driver.sleep(2000);
                    saleLinkClicked = true;
                    break;
                }
            } catch (error) {
                // Continuer
            }
        }

        if (!saleLinkClicked) {
            console.log('❌ Aucun lien de vente cliqué');
            this.testResults.sales = 'failed';
            return;
        }

        await this.analyzeCurrentPage('sales');

        // Analyser les composants de vente
        const clientSearch = await this.driver.findElements(By.css('input[placeholder*="client"], input[name*="client"], .client-search input'));
        const productGrid = await this.driver.findElements(By.css('.product, .item, .card, .grid'));
        const cartArea = await this.driver.findElements(By.css('.cart, .panier, .basket, .sidebar'));

        console.log('\n🛍️ Composants de vente:');
        console.log(`  - Recherche client: ${clientSearch.length}`);
        console.log(`  - Grille produits: ${productGrid.length}`);
        console.log(`  - Zone panier: ${cartArea.length}`);

        // Améliorations pour l'interface de vente
        if (clientSearch.length === 0) {
            this.improvements.push({
                module: 'sales',
                priority: 'high',
                issue: 'Recherche client absente',
                suggestion: 'Ajouter un champ de recherche client en haut de la page de vente'
            });
        }

        if (productGrid.length === 0) {
            this.improvements.push({
                module: 'sales',
                priority: 'high',
                issue: 'Grille de produits absente',
                suggestion: 'Afficher les produits disponibles dans une grille claire'
            });
        }

        if (cartArea.length === 0) {
            this.improvements.push({
                module: 'sales',
                priority: 'medium',
                issue: 'Zone panier non visible',
                suggestion: 'Ajouter une zone panier latérale ou fixe'
            });
        }

        this.testResults.sales = (clientSearch.length > 0 && productGrid.length > 0) ? 'success' : 'partial';
    }

    async generateReport() {
        console.log('\n📋 === RAPPORT D\'AMÉLIORATIONS ===');
        
        console.log('\n📊 Résultats des tests:');
        Object.entries(this.testResults).forEach(([module, result]) => {
            const status = result === 'success' ? '✅' : result === 'partial' ? '⚠️' : '❌';
            console.log(`  ${status} ${module}: ${result}`);
        });

        if (this.improvements.length > 0) {
            console.log('\n💡 Améliorations suggérées par module:');
            
            const improvementsByModule = {};
            this.improvements.forEach(improvement => {
                if (!improvementsByModule[improvement.module]) {
                    improvementsByModule[improvement.module] = [];
                }
                improvementsByModule[improvement.module].push(improvement);
            });

            Object.entries(improvementsByModule).forEach(([module, improvements]) => {
                console.log(`\n🔧 Module: ${module.toUpperCase()}`);
                improvements.forEach((improvement, index) => {
                    const priority = improvement.priority === 'high' ? '🔴' : 
                                   improvement.priority === 'medium' ? '🟡' : '🟢';
                    console.log(`  ${priority} ${index + 1}. ${improvement.issue}`);
                    console.log(`     💡 ${improvement.suggestion}`);
                });
            });
        }

        // Sauvegarder le rapport
        const report = {
            timestamp: new Date().toISOString(),
            testResults: this.testResults,
            improvements: this.improvements,
            summary: {
                totalModules: Object.keys(this.testResults).length,
                successfulModules: Object.values(this.testResults).filter(r => r === 'success').length,
                totalImprovements: this.improvements.length,
                highPriorityImprovements: this.improvements.filter(i => i.priority === 'high').length
            }
        };

        fs.writeFileSync('interactive-test-report.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Rapport sauvegardé: interactive-test-report.json');
    }

    async run() {
        try {
            await this.setup();
            
            await this.testLogin();
            await this.testDashboard();
            await this.testSalesInterface();
            
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
    const test = new InteractiveDepotManagerTest();
    test.run().catch(console.error);
}

module.exports = InteractiveDepotManagerTest;
