#!/bin/bash

# ========================================
# SCRIPT DE TEST API - COMMANDES CLIENT
# ========================================

BACKEND_URL="http://62.72.24.153:8080"
SSH_USER="root"
SSH_IP="62.72.24.153"

echo "🧪 Test de l'API des commandes client..."

# Étape 1: Vérifier si le backend est accessible
echo "📡 Test de connexion au backend..."
curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/commandes/health"
if [ $? -eq 0 ]; then
    echo "✅ Backend accessible"
else
    echo "❌ Backend inaccessible"
    exit 1
fi

# Étape 2: Créer un client test via l'API
echo "👤 Création d'un client test..."
CLIENT_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/clients/creer-rapide" \
    -H "Content-Type: application/json" \
    -d '{
        "raisonSociale": "Client Test API",
        "telephone": "2250102030405",
        "adresse": "Adresse test",
        "pointDeVenteId": 1
    }')

echo "Réponse création client: $CLIENT_RESPONSE"

# Extraire l'ID du client (si la création a réussi)
CLIENT_ID=$(echo "$CLIENT_RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)

if [ -z "$CLIENT_ID" ]; then
    echo "❌ Impossible de créer le client test"
    echo "Vérifions les clients existants..."
    
    # Lister les clients existants
    echo "📋 Liste des clients existants:"
    curl -s "$BACKEND_URL/api/clients?pointDeVenteId=1" | head -200
    exit 1
fi

echo "✅ Client test créé avec ID: $CLIENT_ID"

# Étape 3: Créer une commande test pour ce client
echo "📦 Création d'une commande test..."
COMMANDE_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/commandes" \
    -H "Content-Type: application/json" \
    -d "{
        \"clientId\": $CLIENT_ID,
        \"pointDeVenteId\": 1,
        \"modeRetrait\": \"LIVRAISON\",
        \"typePaiement\": \"ESPECE\",
        \"lignes\": [
            {
                \"produitId\": 1,
                \"quantite\": 2,
                \"prixUnitaire\": 1500
            }
        ]
    }")

echo "Réponse création commande: $COMMANDE_RESPONSE"

# Étape 4: Tester l'endpoint des commandes client
echo "🔍 Test de l'endpoint /api/commandes?clientId=$CLIENT_ID"
COMMANDES_CLIENT=$(curl -s "$BACKEND_URL/api/commandes?clientId=$CLIENT_ID")

echo "Commandes du client:"
echo "$COMMANDES_CLIENT" | jq '.' 2>/dev/null || echo "$COMMANDES_CLIENT"

# Étape 5: Tester avec authentification client
echo "🔐 Test avec authentification client..."

# D'abord créer un utilisateur client
USER_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/client/login" \
    -H "Content-Type: application/json" \
    -d '{
        "phone": "2250102030405",
        "password": "password123"
    }')

echo "Réponse login client: $USER_RESPONSE"

# Extraire le token
TOKEN=$(echo "$USER_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
    echo "✅ Token obtenu: ${TOKEN:0:20}..."
    
    # Tester avec le token
    echo "🔐 Test API avec token JWT..."
    COMMANDES_AUTH=$(curl -s -H "Authorization: Bearer $TOKEN" \
        "$BACKEND_URL/api/commandes?clientId=$CLIENT_ID")
    
    echo "Commandes avec authentification:"
    echo "$COMMANDES_AUTH" | jq '.' 2>/dev/null || echo "$COMMANDES_AUTH"
else
    echo "❌ Impossible d'obtenir le token JWT"
fi

echo "🏁 Test terminé"
