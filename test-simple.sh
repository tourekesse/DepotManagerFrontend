#!/bin/bash

# ========================================
# TEST API - COMMANDES CLIENT EXISTANT
# ========================================

BACKEND_URL="http://62.72.24.153:8085"

echo "🧪 Test de l'API des commandes client existant..."

# Étape 1: Vérifier si le backend est accessible
echo "📡 Test de connexion au backend..."
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/commandes/health")
echo "Code santé backend: $HEALTH_CODE"

if [ "$HEALTH_CODE" != "200" ]; then
    echo "❌ Backend inaccessible ou problème de santé"
    exit 1
fi

# Étape 2: Lister les clients existants
echo "👥 Liste des clients existants..."
CLIENTS=$(curl -s "$BACKEND_URL/api/clients?pointDeVenteId=1")
echo "$CLIENTS" | jq '.' 2>/dev/null || echo "$CLIENTS"

# Étape 3: Prendre le premier client et tester ses commandes
echo ""
echo "📦 Test des commandes du premier client..."

# Extraire l'ID du premier client
FIRST_CLIENT_ID=$(echo "$CLIENTS" | jq -r '.[0].id' 2>/dev/null)
FIRST_CLIENT_NAME=$(echo "$CLIENTS" | jq -r '.[0].nomClient' 2>/dev/null)

if [ -z "$FIRST_CLIENT_ID" ] || [ "$FIRST_CLIENT_ID" = "null" ]; then
    echo "❌ Impossible d'extraire l'ID du premier client"
    exit 1
fi

echo "👤 Client test: $FIRST_CLIENT_NAME (ID: $FIRST_CLIENT_ID)"

# Étape 4: Tester l'endpoint des commandes client
echo ""
echo "🔍 Test de /api/commandes?clientId=$FIRST_CLIENT_ID"
COMMANDES_RESPONSE=$(curl -s "$BACKEND_URL/api/commandes?clientId=$FIRST_CLIENT_ID")
COMMANDES_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/commandes?clientId=$FIRST_CLIENT_ID")

echo "Code HTTP: $COMMANDES_CODE"
echo "Réponse:"
echo "$COMMANDES_RESPONSE" | jq '.' 2>/dev/null || echo "$COMMANDES_RESPONSE"

# Étape 5: Compter les commandes
COMMANDES_COUNT=$(echo "$COMMANDES_RESPONSE" | jq 'length' 2>/dev/null || echo "N/A")
echo ""
echo "📊 Nombre de commandes trouvées: $COMMANDES_COUNT"

# Étape 6: Tester l'authentification client
echo ""
echo "🔐 Test d'authentification client..."

# Essayer de se connecter avec un numéro de téléphone connu
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/client/login" \
    -H "Content-Type: application/json" \
    -d '{
        "phone": "2250777753113",
        "password": "password123"
    }')

echo "Réponse login:"
echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"

# Extraire le token et clientId
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token' 2>/dev/null)
CLIENT_ID_AUTH=$(echo "$LOGIN_RESPONSE" | jq -r '.clientId' 2>/dev/null)

if [ ! -z "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo "✅ Authentification réussie!"
    echo "🔑 Token: ${TOKEN:0:30}..."
    echo "👤 ClientId: $CLIENT_ID_AUTH"
    
    # Tester avec authentification
    echo ""
    echo "🔐 Test API avec authentification JWT..."
    AUTH_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
        "$BACKEND_URL/api/commandes?clientId=$CLIENT_ID_AUTH")
    
    echo "Réponse avec authentification:"
    echo "$AUTH_RESPONSE" | jq '.' 2>/dev/null || echo "$AUTH_RESPONSE"
    
    AUTH_COUNT=$(echo "$AUTH_RESPONSE" | jq 'length' 2>/dev/null || echo "N/A")
    echo "📊 Commandes avec authentification: $AUTH_COUNT"
else
    echo "❌ Échec de l'authentification client"
fi

# Étape 7: Test de l'endpoint mobile
echo ""
echo "📱 Test de l'endpoint mobile /api/commandes-mobile/mes-commandes"
if [ ! -z "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    MOBILE_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
        "$BACKEND_URL/api/commandes-mobile/mes-commandes")
    
    echo "Réponse endpoint mobile:"
    echo "$MOBILE_RESPONSE" | jq '.' 2>/dev/null || echo "$MOBILE_RESPONSE"
    
    MOBILE_COUNT=$(echo "$MOBILE_RESPONSE" | jq 'length' 2>/dev/null || echo "N/A")
    echo "📊 Commandes via endpoint mobile: $MOBILE_COUNT"
fi

echo ""
echo "🏁 Test terminé"
