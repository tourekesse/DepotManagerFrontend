#!/usr/bin/env node

// ========================================
// TEST SELENIUM - DepotManager Sale Test
// ========================================

const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');

class DepotManagerTest {
    constructor() {
        this.driver = null;
        this.results = {
            login: { status: 'pending', time: 0, errors: [] },
            navigation: { status: 'pending', time: 0, errors: [] },
            clientSearch: { status: 'pending', time: 0, errors: [] },
            productAdd: { status: 'pending', time: 0, errors: [] },
            saleValidation: { status: 'pending', time: 0, errors: [] },
            pwaCheck: { status: 'pending', time: 0, errors: [] }
        };
        this.improvements = [];
    }

    async setup() {
        console.log('🚀 Initialisation du test Selenium...');

        const options = new chrome.Options();
        options.addArguments('--start-maximized');
        options.addArguments('--disable-web-security');
        options.addArguments('--disable-features=VizDisplayCompositor');
        options.addArguments('--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1');

        this.driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();

        console.log('✅ Driver Chrome configuré');
    }

    async teardown() {
        if (this.driver) {
            await this.driver.quit();
            console.log('🧹 Driver fermé');
        }
    }

    async takeScreenshot(name) {
        const screenshot = await this.driver.takeScreenshot();
        fs.writeFileSync(`selenium-screenshot-${name}.png`, screenshot, 'base64');
        console.log(`📸 Screenshot sauvegardé: ${name}`);
    }

    async measureTime(operation, callback) {
        const start = Date.now();
        try {
            await callback();
            const duration = Date.now() - start;
            return { success: true, duration };
        } catch (error) {
            const duration = Date.now() - start;
            return { success: false, duration, error: error.message };
        }
    }

    async testLogin() {
        console.log('\n🔐 Test de connexion...');

        const result = await this.measureTime('login', async () => {
            await this.driver.get('https://depotmanager.gm-soft.ca/login');

            // Attendre que la page se charge
            await this.driver.wait(until.elementLocated(By.css('input[type="email"], input[name*="email"], input[placeholder*="email"]')), 10000);

            // Trouver les champs de connexion
            const emailField = await this.driver.findElement(By.css('input[type="email"], input[name*="email"], input[placeholder*="email"]'));
            const passwordField = await this.driver.findElement(By.css('input[type="password"], input[name*="password"], input[placeholder*="password"]'));
            const submitButton = await this.driver.findElement(By.css('button[type="submit"], button:contains("Connexion"), button:contains("Login")'));

            // Remplir les champs
            await emailField.clear();
            await emailField.sendKeys('kesseguillaume@gmail.com');

            await passwordField.clear();
            await passwordField.sendKeys('toure');

            // Prendre screenshot avant connexion
            await this.takeScreenshot('before-login');

            // Cliquer sur connexion
            await submitButton.click();

            // Attendre la redirection ou le succès
            await this.driver.wait(until.urlContains('/dashboard'), 15000);

            console.log('✅ Connexion réussie');
        });

        this.results.login = {
            status: result.success ? 'success' : 'failed',
            time: result.duration,
            errors: result.success ? [] : [result.error]
        };

        if (result.success) {
            await this.takeScreenshot('after-login');
        }
    }

    async testNavigation() {
        console.log('\n🧭 Test de navigation vers vente...');

        const result = await this.measureTime('navigation', async () => {
            // Chercher le menu de vente
            const menuItems = await this.driver.findElements(By.css('nav a, .menu a, .sidebar a, .navbar a'));
            let saleLink = null;

            for (const item of menuItems) {
                const text = await item.getText();
                const href = await item.getAttribute('href');

                if (text.toLowerCase().includes('vente') ||
                    text.toLowerCase().includes('sale') ||
                    text.toLowerCase().includes('commande') ||
                    href && href.includes('vente')) {
                    saleLink = item;
                    break;
                }
            }

            if (!saleLink) {
                throw new Error('Lien vers les ventes non trouvé');
            }

            await saleLink.click();

            // Attendre le chargement de la page de vente
            await this.driver.wait(until.elementLocated(By.css('.product-list, .products, [data-testid*="product"], .card')), 10000);

            console.log('✅ Navigation vers vente réussie');
        });

        this.results.navigation = {
            status: result.success ? 'success' : 'failed',
            time: result.duration,
            errors: result.success ? [] : [result.error]
        };

        if (result.success) {
            await this.takeScreenshot('sale-page');
        }
    }

    async testClientSearch() {
        console.log('\n👥 Test de recherche client...');

        const result = await this.measureTime('clientSearch', async () => {
            // Chercher le champ de recherche client
            const searchFields = await this.driver.findElements(By.css('input[placeholder*="client"], input[name*="client"], input[placeholder*="rechercher"], .client-search input'));

            if (searchFields.length === 0) {
                throw new Error('Champ de recherche client non trouvé');
            }

            const clientSearch = searchFields[0];
            await clientSearch.clear();
            await clientSearch.sendKeys('test');

            // Attendre les résultats
            await this.driver.sleep(2000);

            // Vérifier si des résultats apparaissent
            const results = await this.driver.findElements(By.css('.client-result, .client-item, .client-card'));

            if (results.length === 0) {
                this.improvements.push({
                    type: 'UX',
                    priority: 'medium',
                    issue: 'Recherche client sans résultats - améliorer l\'interface',
                    suggestion: 'Ajouter un message "Aucun client trouvé" ou suggérer la création'
                });
            }

            console.log(`✅ Recherche client : ${results.length} résultats trouvés`);
        });

        this.results.clientSearch = {
            status: result.success ? 'success' : 'failed',
            time: result.duration,
            errors: result.success ? [] : [result.error]
        };
    }

    async testProductAdd() {
        console.log('\n🛒 Test d\'ajout de produits...');

        const result = await this.measureTime('productAdd', async () => {
            // Chercher les produits disponibles
            const products = await this.driver.findElements(By.css('.product-card, .product-item, .product, [data-product]'));

            if (products.length === 0) {
                throw new Error('Aucun produit trouvé sur la page');
            }

            console.log(`📦 ${products.length} produits trouvés`);

            // Sélectionner les 2 premiers produits
            for (let i = 0; i < Math.min(2, products.length); i++) {
                try {
                    await products[i].click();

                    // Attendre un peu pour voir si ça s'ajoute au panier
                    await this.driver.sleep(1000);

                    console.log(`✅ Produit ${i + 1} ajouté`);
                } catch (error) {
                    console.log(`⚠️ Erreur ajout produit ${i + 1}: ${error.message}`);
                }
            }

            // Vérifier le panier
            const cartItems = await this.driver.findElements(By.css('.cart-item, .panier-item, .basket-item'));
            const cartTotal = await this.driver.findElements(By.css('.cart-total, .panier-total, .total-amount'));

            if (cartItems.length === 0) {
                this.improvements.push({
                    type: 'UX',
                    priority: 'high',
                    issue: 'Panier non visible après ajout de produits',
                    suggestion: 'Ajouter un indicateur visuel du panier et du nombre d\'articles'
                });
            }

            if (cartTotal.length === 0) {
                this.improvements.push({
                    type: 'UX',
                    priority: 'high',
                    issue: 'Total du panier non affiché',
                    suggestion: 'Afficher toujours le total du panier en haut de page'
                });
            }

            await this.takeScreenshot('cart-after-add');
        });

        this.results.productAdd = {
            status: result.success ? 'success' : 'failed',
            time: result.duration,
            errors: result.success ? [] : [result.error]
        };
    }

    async testSaleValidation() {
        console.log('\n✅ Test de validation de vente...');

        const result = await this.measureTime('saleValidation', async () => {
            // Chercher le bouton de validation
            const buttons = await this.driver.findElements(By.css('button:contains("Valider"), button:contains("Confirmer"), button[type="submit"], .validate-btn'));

            let validateButton = null;
            for (const button of buttons) {
                const text = await button.getText();
                if (text.toLowerCase().includes('valider') ||
                    text.toLowerCase().includes('confirmer') ||
                    text.toLowerCase().includes('commander')) {
                    validateButton = button;
                    break;
                }
            }

            if (!validateButton) {
                throw new Error('Bouton de validation non trouvé');
            }

            // Vérifier si le bouton est cliquable
            const isEnabled = await validateButton.isEnabled();
            if (!isEnabled) {
                this.improvements.push({
                    type: 'UX',
                    priority: 'high',
                    issue: 'Bouton de validation désactivé',
                    suggestion: 'Ajouter des messages explicatifs sur pourquoi la validation est impossible'
                });
                throw new Error('Bouton de validation désactivé');
            }

            await this.takeScreenshot('before-validation');

            // Cliquer sur valider (mais ne pas vraiment valider pour éviter les vraies ventes)
            console.log('✅ Bouton de validation trouvé et actif');
            console.log('⚠️ Validation annulée pour éviter les vraies ventes en test');
        });

        this.results.saleValidation = {
            status: result.success ? 'success' : 'failed',
            time: result.duration,
            errors: result.success ? [] : [result.error]
        };
    }

    async testPWACheck() {
        console.log('\n📱 Test fonctionnalités PWA...');

        const result = await this.measureTime('pwaCheck', async () => {
            // Vérifier le manifest
            try {
                const manifestLink = await this.driver.findElement(By.css('link[rel="manifest"]'));
                const manifestHref = await manifestLink.getAttribute('href');
                console.log(`✅ Manifest trouvé: ${manifestHref}`);
            } catch (error) {
                this.improvements.push({
                    type: 'PWA',
                    priority: 'high',
                    issue: 'Manifest PWA manquant',
                    suggestion: 'Ajouter un manifest.json pour l\'installation PWA'
                });
            }

            // Vérifier le service worker
            const serviceWorkerScript = `
                return navigator.serviceWorker.getRegistrations()
                    .then(registrations => registrations.length > 0);
            `;

            const hasSW = await this.driver.executeScript(serviceWorkerScript);

            if (!hasSW) {
                this.improvements.push({
                    type: 'PWA',
                    priority: 'high',
                    issue: 'Service Worker non enregistré',
                    suggestion: 'Enregistrer un service worker pour le cache hors ligne'
                });
            } else {
                console.log('✅ Service Worker enregistré');
            }

            // Vérifier l'installabilité
            const isInstallable = await this.driver.executeScript(`
                return window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;
            `);

            if (!isInstallable) {
                this.improvements.push({
                    type: 'PWA',
                    priority: 'medium',
                    issue: 'Application non installable',
                    suggestion: 'Ajouter les critères d\'installabilité PWA'
                });
            } else {
                console.log('✅ Application installable');
            }
        });

        this.results.pwaCheck = {
            status: result.success ? 'success' : 'failed',
            time: result.duration,
            errors: result.success ? [] : [result.error]
        };
    }

    async generateReport() {
        console.log('\n📊 === RAPPORT DE TEST SELENIUM ===');

        // Résumé des résultats
        const totalTests = Object.keys(this.results).length;
        const successfulTests = Object.values(this.results).filter(r => r.status === 'success').length;
        const failedTests = Object.values(this.results).filter(r => r.status === 'failed').length;

        console.log(`\n📈 Résumé: ${successfulTests}/${totalTests} tests réussis`);

        // Détails par test
        console.log('\n🔍 Détails des tests:');
        for (const [testName, result] of Object.entries(this.results)) {
            const status = result.status === 'success' ? '✅' : '❌';
            const time = result.time ? ` (${result.time}ms)` : '';
            console.log(`  ${status} ${testName}${time}`);

            if (result.errors.length > 0) {
                result.errors.forEach(error => console.log(`    ❌ ${error}`));
            }
        }

        // Améliorations suggérées
        if (this.improvements.length > 0) {
            console.log('\n💡 === AMÉLIORATIONS SUGGÉRÉES ===');

            const sortedImprovements = this.improvements.sort((a, b) => {
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            });

            sortedImprovements.forEach((improvement, index) => {
                const priorityIcon = improvement.priority === 'high' ? '🔴' :
                                   improvement.priority === 'medium' ? '🟡' : '🟢';
                console.log(`\n${priorityIcon} [${improvement.priority.toUpperCase()}] ${improvement.type}`);
                console.log(`  📝 ${improvement.issue}`);
                console.log(`  💡 ${improvement.suggestion}`);
            });
        }

        // Sauvegarder le rapport
        const report = {
            timestamp: new Date().toISOString(),
            results: this.results,
            improvements: this.improvements,
            summary: {
                totalTests,
                successfulTests,
                failedTests,
                successRate: Math.round((successfulTests / totalTests) * 100)
            }
        };

        fs.writeFileSync('selenium-test-report.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Rapport détaillé sauvegardé: selenium-test-report.json');
    }

    async run() {
        try {
            await this.setup();

            await this.testLogin();
            await this.testNavigation();
            await this.testClientSearch();
            await this.testProductAdd();
            await this.testSaleValidation();
            await this.testPWACheck();

            await this.generateReport();

        } catch (error) {
            console.error('❌ Erreur générale:', error);
        } finally {
            await this.teardown();
        }
    }
}

// Lancer le test
if (require.main === module) {
    const test = new DepotManagerTest();
    test.run().catch(console.error);
}

module.exports = DepotManagerTest;
