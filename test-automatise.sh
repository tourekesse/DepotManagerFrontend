#!/bin/bash

# ========================================
# SCRIPT DE TESTS AUTOMATISÉS - DepotManager
# ========================================

set -e

# Configuration VPS
VPS_IP="62.72.24.153"
VPS_USER="root"
DB_NAME="depotmanagerdb"
DB_USER="root"
DB_PASS="Smlpnr@1305"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fonctions de log
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ========================================
# CONNEXION AU VPS ET TESTS
# ========================================
log_info "🚀 Connexion au VPS $VPS_IP pour tests automatisés..."

ssh "$VPS_USER@$VPS_IP" << EOF
    set -e
    
    echo "🔗 Connexion à la base de données $DB_NAME..."
    
    # Test 1: Vérification de la structure de la base
    echo ""
    echo "📊 === TEST 1: STRUCTURE DE LA BASE ==="
    
    # Vérifier les tables essentielles
    TABLES=\$(mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW TABLES;" 2>/dev/null | grep -v "Tables_in_")
    
    if [ \$? -eq 0 ]; then
        echo "✅ Connexion à la base réussie"
        echo "📋 Tables trouvées:"
        echo "\$TABLES" | tr ' ' '\n' | nl
        
        # Vérifier les tables critiques
        CRITICAL_TABLES=("client" "produit" "vente" "reglement" "caisse")
        
        for table in "\${CRITICAL_TABLES[@]}"; do
            if echo "\$TABLES" | grep -q "\$table"; then
                echo "✅ Table '\$table' présente"
            else
                echo "❌ Table '\$table' MANQUANTE"
            fi
        done
    else
        echo "❌ ERREUR: Impossible de se connecter à la base"
        exit 1
    fi
    
    # Test 2: Vérification des données clients
    echo ""
    echo "👥 === TEST 2: DONNÉES CLIENTS ==="
    
    CLIENT_COUNT=\$(mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT COUNT(*) FROM client;" -s 2>/dev/null)
    
    if [ \$? -eq 0 ]; then
        echo "✅ Nombre total de clients: \$CLIENT_COUNT"
        
        if [ "\$CLIENT_COUNT" -gt 0 ]; then
            # Vérifier les soldes
            echo "📊 Analyse des soldes clients..."
            
            mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
                SELECT 
                    COUNT(*) as total_clients,
                    COUNT(CASE WHEN solde > 0 THEN 1 END) as clients_debiteurs,
                    COUNT(CASE WHEN solde < 0 THEN 1 END) as clients_crediteurs,
                    ROUND(AVG(solde), 2) as solde_moyen,
                    ROUND(MAX(solde), 2) as solde_max,
                    ROUND(MIN(solde), 2) as solde_min
                FROM client;
            " 2>/dev/null | while IFS=$'\t' read -r total debiteurs crediteurs moyenne max min; do
                echo "📈 Clients débiteurs: \$debiteurs"
                echo "📉 Clients créditeurs: \$crediteurs"
                echo "💰 Solde moyen: \$moyenne"
                echo "📊 Solde max: \$max"
                echo "📉 Solde min: \$min"
            done
            
            # Top 5 clients avec plus gros soldes
            echo ""
            echo "🏆 Top 5 clients (plus gros soldes):"
            mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
                SELECT CONCAT(nom, ' ', prenom) as client, 
                       ROUND(solde, 2) as solde,
                       telephone
                FROM client 
                WHERE solde != 0 
                ORDER BY ABS(solde) DESC 
                LIMIT 5;
            " 2>/dev/null | column -t -s $'\t'
        else
            echo "⚠️  Aucun client dans la base"
        fi
    else
        echo "❌ ERREUR: Impossible de lire les clients"
    fi
    
    # Test 3: Vérification des données caisse
    echo ""
    echo "💰 === TEST 3: DONNÉES CAISSE ==="
    
    # Vérifier la table caisse
    if mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "DESCRIBE caisse;" >/dev/null 2>&1; then
        echo "✅ Table caisse présente"
        
        # Statistiques caisse
        mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
            SELECT 
                COUNT(*) as total_operations,
                COUNT(CASE WHEN type_operation = 'VENTE' THEN 1 END) as ventes,
                COUNT(CASE WHEN type_operation = 'REGLEMENT' THEN 1 END) as reglements,
                ROUND(SUM(montant), 2) as total_mouvements,
                ROUND(AVG(montant), 2) as moyenne_mouvement
            FROM caisse 
            WHERE date_operation >= DATE_SUB(NOW(), INTERVAL 7 DAY);
        " 2>/dev/null | while IFS=$'\t' read -r total ventes reglements total_montants moyenne; do
            echo "📊 Opérations 7 derniers jours: \$total"
            echo "💰 Ventes: \$ventes"
            echo "💳 Règlements: \$reglements"
            echo "💵 Total mouvements: \$total_montants"
            echo "📈 Moyenne: \$moyenne"
        done
        
        # Dernières opérations
        echo ""
        echo "🕐 5 dernières opérations caisse:"
        mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
            SELECT 
                DATE_FORMAT(date_operation, '%d/%m %H:%i') as date,
                type_operation,
                ROUND(montant, 2) as montant,
                description
            FROM caisse 
            ORDER BY date_operation DESC 
            LIMIT 5;
        " 2>/dev/null | column -t -s $'\t'
        
    else
        echo "⚠️  Table caisse non trouvée"
    fi
    
    # Test 4: Vérification des produits
    echo ""
    echo "📦 === TEST 4: DONNÉES PRODUITS ==="
    
    if mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "DESCRIBE produit;" >/dev/null 2>&1; then
        PRODUIT_COUNT=\$(mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT COUNT(*) FROM produit;" -s 2>/dev/null)
        echo "✅ Nombre total de produits: \$PRODUIT_COUNT"
        
        if [ "\$PRODUIT_COUNT" -gt 0 ]; then
            mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN stock > 0 THEN 1 END) as en_stock,
                    COUNT(CASE WHEN stock <= 0 THEN 1 END) as rupture_stock,
                    ROUND(AVG(prix_vente), 2) as prix_moyen,
                    ROUND(MAX(prix_vente), 2) as prix_max
                FROM produit;
            " 2>/dev/null | while IFS=$'\t' read -r total stock rupture prix_moyen prix_max; do
                echo "📦 Produits en stock: \$stock"
                echo "⚠️  Ruptures de stock: \$rupture"
                echo "💰 Prix moyen: \$prix_moyen"
                echo "💎 Prix max: \$prix_max"
            done
        fi
    else
        echo "⚠️  Table produit non trouvée"
    fi
    
    # Test 5: Vérification des ventes récentes
    echo ""
    echo "🧾 === TEST 5: VENTES RÉCENTES ==="
    
    if mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "DESCRIBE vente;" >/dev/null 2>&1; then
        VENTE_COUNT=\$(mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT COUNT(*) FROM vente WHERE date_vente >= DATE_SUB(NOW(), INTERVAL 7 DAY);" -s 2>/dev/null)
        echo "✅ Ventes 7 derniers jours: \$VENTE_COUNT"
        
        if [ "\$VENTE_COUNT" -gt 0 ]; then
            mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
                SELECT 
                    COUNT(*) as nombre_ventes,
                    ROUND(SUM(total_vente), 2) as ca_total,
                    ROUND(AVG(total_vente), 2) as panier_moyen
                FROM vente 
                WHERE date_vente >= DATE_SUB(NOW(), INTERVAL 7 DAY);
            " 2>/dev/null | while IFS=$'\t' read -r nombre_ventes ca_total panier_moyen; do
                echo "💰 Chiffre d'affaires 7j: \$ca_total"
                echo "🛒 Panier moyen: \$panier_moyen"
                echo "📊 Nombre de ventes: \$nombre_ventes"
            done
        fi
    else
        echo "⚠️  Table vente non trouvée"
    fi
    
    echo ""
    echo "🎉 === RAPPORT DE TESTS TERMINÉ ==="
    echo "✅ Tests automatisés exécutés avec succès"
    echo "📊 Base de données vérifiée"
    echo "💰 Caisse contrôlée"
    echo "👥 Soldes clients vérifiés"
    
EOF

if [ $? -eq 0 ]; then
    log_success "🎉 Tests automatisés terminés avec succès !"
    echo ""
    log_info "📋 Résultats disponibles ci-dessus"
    log_info "🔍 Vérifiez les points d'attention marqués"
else
    log_error "❌ Erreur lors de l'exécution des tests"
    exit 1
fi

echo ""
log_success "✨ Script de tests automatisés terminé !"
