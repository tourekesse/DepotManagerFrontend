#!/bin/bash

# ========================================
# TEST COMPLET API - POINTS DE VENTE, CLIENTS, COMMANDES
# ========================================

BACKEND_URL="http://62.72.24.153:8085"

echo "🧪 Test complet de l'API..."

# Étape 1: Vérifier les points de vente
echo ""
echo "🏪 Vérification des points de vente..."
PV_RESPONSE=$(curl -s "$BACKEND_URL/api/points-vente")
echo "Réponse points de vente:"
echo "$PV_RESPONSE" | jq '.' 2>/dev/null || echo "$PV_RESPONSE"

# Étape 2: Vérifier toutes les commandes
echo ""
echo "📦 Vérification de toutes les commandes..."
ALL_COMMANDES=$(curl -s "$BACKEND_URL/api/commandes")
echo "Réponse toutes les commandes:"
echo "$ALL_COMMANDES" | jq '.' 2>/dev/null || echo "$ALL_COMMANDES"

COMMANDES_COUNT=$(echo "$ALL_COMMANDES" | jq 'length' 2>/dev/null || echo "N/A")
echo "📊 Nombre total de commandes: $COMMANDES_COUNT"

# Étape 3: Si des commandes existent, extraire les clientId
if [ "$COMMANDES_COUNT" != "0" ] && [ "$COMMANDES_COUNT" != "N/A" ]; then
    echo ""
    echo "👤 Extraction des clientId des commandes..."
    CLIENT_IDS=$(echo "$ALL_COMMANDES" | jq -r '.[].clientId' 2>/dev/null | sort -u)
    echo "ClientIDs trouvés: $CLIENT_IDS"
    
    # Pour chaque clientId, tester ses commandes
    for CLIENT_ID in $CLIENT_IDS; do
        if [ "$CLIENT_ID" != "null" ] && [ ! -z "$CLIENT_ID" ]; then
            echo ""
            echo "🔍 Test des commandes pour clientId: $CLIENT_ID"
            CLIENT_COMMANDES=$(curl -s "$BACKEND_URL/api/commandes?clientId=$CLIENT_ID")
            echo "Commandes du client $CLIENT_ID:"
            echo "$CLIENT_COMMANDES" | jq '.' 2>/dev/null || echo "$CLIENT_COMMANDES"
            
            CLIENT_COUNT=$(echo "$CLIENT_COMMANDES" | jq 'length' 2>/dev/null || echo "N/A")
            echo "📊 Nombre de commandes: $CLIENT_COUNT"
        fi
    done
else
    echo "❌ Aucune commande trouvée dans la base"
fi

# Étape 4: Vérifier les clients sans filtre point de vente
echo ""
echo "👥 Vérification de tous les clients (sans filtre)..."
ALL_CLIENTS=$(curl -s "$BACKEND_URL/api/clients")
echo "Réponse tous les clients:"
echo "$ALL_CLIENTS" | jq '.' 2>/dev/null || echo "$ALL_CLIENTS"

# Étape 5: Vérifier la base de données directement
echo ""
echo "🗄️ Vérification directe de la base de données..."
DB_CHECK=$(ssh root@62.72.24.153 "mysql -u root -p'Smlpnr@1305' depotmanager -e 'SELECT COUNT(*) as total_commandes FROM commande; SELECT COUNT(*) as total_clients FROM client; SELECT COUNT(*) as total_pdv FROM point_de_vente;' 2>/dev/null")
echo "Résultats base de données:"
echo "$DB_CHECK"

# Étape 6: Test avec un point de vente spécifique
echo ""
echo "🏪 Test avec point de vente ID 1..."
PV1_CLIENTS=$(curl -s "$BACKEND_URL/api/clients?pointDeVenteId=1")
echo "Clients du point de vente 1:"
echo "$PV1_CLIENTS" | jq '.' 2>/dev/null || echo "$PV1_CLIENTS"

# Étape 7: Test endpoint mobile
echo ""
echo "📱 Test endpoint mobile health..."
MOBILE_HEALTH=$(curl -s "$BACKEND_URL/api/commandes-mobile/health")
echo "Santé endpoint mobile: $MOBILE_HEALTH"

echo ""
echo "🏁 Test terminé"
