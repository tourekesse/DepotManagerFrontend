#!/bin/bash

# ========================================
# SCRIPT DE DÉPLOIEMENT VPS - DepotManager Frontend
# ========================================

set -e  # Arrête le script en cas d'erreur

# Configuration
VPS_USER="root"  # Changez selon votre configuration VPS
VPS_IP="62.72.24.153"  # Mettez l'IP de votre VPS ici
VPS_PATH="/var/www/depotmanager-frontend"
LOCAL_BUILD_PATH="./build"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Vérification des paramètres
if [ -z "$VPS_IP" ]; then
    log_error "Veuillez configurer l'IP de votre VPS dans ce script (variable VPS_IP)"
    exit 1
fi

# ========================================
# ÉTAPE 1: Build de production
# ========================================
log_info "🏗️  Construction de l'application pour la production..."

log_info "Build non trouvé, lancement du build mobile optimisé..."
npm run build:mobile

if [ ! -d "$LOCAL_BUILD_PATH" ]; then
    log_error "Le build a échoué. Veuillez vérifier les erreurs ci-dessus."
    exit 1
fi

log_success "✅ Build terminé avec succès"

# ========================================
# Vérification PWA
# ========================================
log_info "📱 Vérification des fichiers PWA..."

if [ -f "$LOCAL_BUILD_PATH/sw-mobile.js" ]; then
    log_success "✅ Service Worker PWA trouvé"
else
    log_warning "⚠️  Service Worker PWA non trouvé"
fi

if [ -f "$LOCAL_BUILD_PATH/manifest.json" ]; then
    log_success "✅ Manifest PWA trouvé"
else
    log_warning "⚠️  Manifest PWA non trouvé"
fi

# ========================================
# ÉTAPE 2: Préparation du déploiement
# ========================================
log_info "📦 Préparation des fichiers pour le déploiement..."

# Création d'un package temporaire
TEMP_PACKAGE="/tmp/depotmanager-deploy-$(date +%s).tar.gz"
tar -czf "$TEMP_PACKAGE" -C "$LOCAL_BUILD_PATH" .

log_success "✅ Package créé: $TEMP_PACKAGE"

# ========================================
# ÉTAPE 3: Connexion au VPS et déploiement
# ========================================
log_info "🚀 Connexion au VPS $VPS_IP..."

# Création du répertoire de destination s'il n'existe pas
ssh "$VPS_USER@$VPS_IP" "mkdir -p $VPS_PATH"

# Transfert du package
log_info "📤 Transfert des fichiers vers le VPS..."
scp "$TEMP_PACKAGE" "$VPS_USER@$VPS_IP:/tmp/"

# Déploiement sur le VPS
log_info "🔧 Installation sur le VPS..."
ssh "$VPS_USER@$VPS_IP" << 'EOF'
    set -e
    
    echo "🧹 Nettoyage COMPLET des anciens fichiers..."
    rm -rf $VPS_PATH/*
    
    # Suppression de TOUS les anciens packages de déploiement
    rm -f /tmp/depotmanager-deploy-*.tar.gz
    
    # Nettoyage cache nginx (optionnel)
    if command -v nginx &> /dev/null; then
        nginx -s reload 2>/dev/null || true
    fi
    
    echo "📂 Extraction des nouveaux fichiers..."
    cd $VPS_PATH
    tar -xzf /tmp/depotmanager-deploy-*.tar.gz --strip-components=1
    
    echo "🔐 Configuration des permissions..."
    chown -R www-data:www-data $VPS_PATH
    chmod -R 755 $VPS_PATH
    
    echo "🧹 Nettoyage des fichiers temporaires..."
    rm -f /tmp/depotmanager-deploy-*.tar.gz
    
    echo "✅ Déploiement terminé sur le VPS"
EOF

# Nettoyage local
rm -f "$TEMP_PACKAGE"

log_success "🎉 Déploiement réussi !"

# ========================================
# ÉTAPE 4: Configuration du serveur web
# ========================================
log_info "⚙️  Configuration recommandée pour Nginx:"
echo ""
echo "Ajoutez cette configuration dans /etc/nginx/sites-available/depotmanager:"
echo ""
cat << 'EOF'
server {
    listen 80;
    server_name votre-domaine.com;  # Changez avec votre domaine
    
    root /var/www/depotmanager-frontend;
    index index.html;
    
    # 🚀 Headers PWA
    add_header Service-Worker-Allowed "/";
    
    # 📱 Service Worker (pas de cache pour SW)
    location = /sw-mobile.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Service-Worker-Allowed "/";
        try_files $uri =200;
    }
    
    # 📱 Manifest PWA
    location = /manifest.json {
        add_header Cache-Control "no-cache";
        add_header Content-Type "application/manifest+json";
        try_files $uri =200;
    }
    
    # 🖼️ Images avec cache agressif et support WebP
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        gzip_static on;
        brotli_static on;
        add_header Vary Accept-Encoding;
    }
    
    # 🔄 Gestion du routing React
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 🔐 Sécurité
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # 📡 API Proxy (si votre backend est sur le même serveur)
    location /api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

echo ""
log_info "📋 Commandes à exécuter sur le VPS:"
echo "   sudo ln -s /etc/nginx/sites-available/depotmanager /etc/nginx/sites-enabled/"
echo "   sudo nginx -t"
echo "   sudo systemctl reload nginx"
echo ""
log_info "🌐 Votre application sera accessible sur: http://votre-domaine.com"
echo ""
log_info "📱 Tests PWA recommandés après déploiement :"
echo "   1. curl -I http://votre-domaine.com/sw-mobile.js"
echo "   2. curl -I http://votre-domaine.com/manifest.json"
echo "   3. Tester l'installation PWA sur mobile"
echo "   4. Vérifier le mode hors ligne"
echo ""
log_success "✨ Déploiement PWA terminé avec succès !"
