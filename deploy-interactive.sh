#!/bin/bash

# ========================================
# SCRIPT DE DÉPLOIEMENT AUTOMATIQUE VPS
# ========================================

# Demander l'IP du VPS si non configurée
VPS_IP="62.72.24.153"  # IP du VPS fournie

# Demander l'utilisateur VPS
echo -n "Entrez l'utilisateur VPS (root par défaut) : "
read VPS_USER_INPUT
VPS_USER=${VPS_USER_INPUT:-root}

# Configuration
VPS_PATH="/var/www/depotmanager-frontend"
LOCAL_BUILD_PATH="./build"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Démarrage du déploiement vers $VPS_USER@$VPS_IP${NC}"

# Test de connexion
echo -e "${YELLOW}🔍 Test de connexion au VPS...${NC}"
if ! ssh -o ConnectTimeout=10 "$VPS_USER@$VPS_IP" "echo 'Connexion réussie'" 2>/dev/null; then
    echo -e "${RED}❌ Impossible de se connecter au VPS. Vérifiez l'IP, l'utilisateur et votre clé SSH.${NC}"
    exit 1
fi

# Build
echo -e "${YELLOW}🏗️  Build de production...${NC}"
npm run build

# Création package
TEMP_PACKAGE="/tmp/depotmanager-$(date +%s).tar.gz"
tar -czf "$TEMP_PACKAGE" -C "$LOCAL_BUILD_PATH" .

# Transfert
echo -e "${YELLOW}📤 Transfert des fichiers...${NC}"
scp "$TEMP_PACKAGE" "$VPS_USER@$VPS_IP:/tmp/"

# Déploiement
echo -e "${YELLOW}🔧 Installation sur le VPS..."
ssh "$VPS_USER@$VPS_IP" << EOF
    set -e
    mkdir -p $VPS_PATH
    cd $VPS_PATH
    rm -rf *
    tar -xzf /tmp/depotmanager-*.tar.gz --strip-components=1
    chown -R www-data:www-data $VPS_PATH 2>/dev/null || chown -R $VPS_USER:$VPS_USER $VPS_PATH
    chmod -R 755 $VPS_PATH
    rm -f /tmp/depotmanager-*.tar.gz
    echo "✅ Fichiers installés"
EOF

# Nettoyage
rm -f "$TEMP_PACKAGE"

echo -e "${GREEN}🎉 Déploiement réussi !${NC}"
echo -e "${GREEN}🌐 Application disponible sur: http://$VPS_IP${NC}"
echo ""
echo -e "${YELLOW}📋 Prochaines étapes :${NC}"
echo "1. Configurez Nginx avec la commande fournie"
echo "2. Pointez votre domaine vers cette IP"
echo "3. Configurez SSL avec Certbot (recommandé)"
