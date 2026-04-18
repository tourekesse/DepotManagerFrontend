#!/bin/bash

# ========================================
# SCRIPT DE DÉPLOIEMENT VPS - DepotManager Frontend
# AVEC OPTIMISATIONS PWA & PERFORMANCE MOBILE
# ========================================

set -e  # Arrête le script en cas d'erreur

# Configuration
VPS_USER="root"  # Changez selon votre configuration VPS
VPS_IP="62.72.24.153"  # Mettez l'IP de votre VPS ici
VPS_PATH="/var/www/depotmanager-frontend"
LOCAL_BUILD_PATH="./build"
DOMAIN="votre-domaine.com"  # Changez avec votre domaine

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
# ÉTAPE 1: Build de production MOBILE OPTIMISÉ
# ========================================
log_info "🚀 Construction de l'application avec optimisations mobiles..."

# Nettoyage du build précédent
if [ -d "$LOCAL_BUILD_PATH" ]; then
    log_info "🧹 Nettoyage du build précédent..."
    rm -rf "$LOCAL_BUILD_PATH"
fi

# Build mobile optimisé
log_info "📱 Build mobile optimisé avec PWA..."
npm run build:mobile

if [ ! -d "$LOCAL_BUILD_PATH" ]; then
    log_error "Le build mobile a échoué. Vérifiez les erreurs ci-dessus."
    exit 1
fi

log_success "✅ Build mobile terminé avec succès"

# Vérification des fichiers PWA critiques
if [ ! -f "$LOCAL_BUILD_PATH/sw-mobile.js" ]; then
    log_warning "⚠️  Service Worker mobile non trouvé"
fi

if [ ! -f "$LOCAL_BUILD_PATH/manifest.json" ]; then
    log_warning "⚠️  Manifest PWA non trouvé"
fi

# ========================================
# ÉTAPE 2: Analyse des performances
# ========================================
log_info "📊 Analyse des performances du build..."

if [ -f "scripts/check-bundle-size.js" ]; then
    node scripts/check-bundle-size.js
    log_success "✅ Analyse des performances terminée"
else
    log_warning "⚠️  Script d'analyse non trouvé, utilisation du build tel quel"
fi

# ========================================
# ÉTAPE 3: Préparation du déploiement
# ========================================
log_info "📦 Préparation des fichiers pour le déploiement..."

# Création d'un package temporaire avec compression
TEMP_PACKAGE="/tmp/depotmanager-deploy-$(date +%s).tar.gz"
tar -czf "$TEMP_PACKAGE" -C "$LOCAL_BUILD_PATH" .

log_success "✅ Package créé: $TEMP_PACKAGE"

# ========================================
# ÉTAPE 4: Connexion au VPS et déploiement
# ========================================
log_info "🚀 Connexion au VPS $VPS_IP..."

# Création du répertoire de destination s'il n'existe pas
ssh "$VPS_USER@$VPS_IP" "mkdir -p $VPS_PATH"

# Transfert du package
log_info "📤 Transfert des fichiers vers le VPS..."
scp "$TEMP_PACKAGE" "$VPS_USER@$VPS_IP:/tmp/"

# Déploiement sur le VPS avec optimisations
log_info "🔧 Installation sur le VPS avec optimisations PWA..."
ssh "$VPS_USER@$VPS_IP" << EOF
    set -e
    
    echo "🧹 Nettoyage des anciens fichiers build..."
    rm -rf $VPS_PATH/*
    
    echo "📂 Extraction des fichiers..."
    cd $VPS_PATH
    tar -xzf /tmp/depotmanager-deploy-*.tar.gz --strip-components=1
    
    echo "🔐 Configuration des permissions..."
    chown -R www-data:www-data $VPS_PATH
    chmod -R 755 $VPS_PATH
    
    echo "🗂️  Création des répertoires de cache..."
    mkdir -p /var/cache/nginx/depotmanager
    chown -R www-data:www-data /var/cache/nginx/depotmanager
    
    echo "🧹 Nettoyage des fichiers temporaires..."
    rm -f /tmp/depotmanager-deploy-*.tar.gz
    
    echo "✅ Déploiement terminé sur le VPS"
EOF

# Nettoyage local
rm -f "$TEMP_PACKAGE"

log_success "🎉 Déploiement réussi !"

# ========================================
# ÉTAPE 5: Configuration Nginx avec PWA & Performance
# ========================================
log_info "⚙️  Configuration Nginx avec optimisations PWA & Performance:"
echo ""
echo "Ajoutez cette configuration dans /etc/nginx/sites-available/depotmanager:"
echo ""
cat << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # Redirection vers HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # Configuration SSL (à générer avec Let's Encrypt)
    # ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    # ssl_protocols TLSv1.2 TLSv1.3;
    # ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    root $VPS_PATH;
    index index.html;
    
    # 🚀 Headers PWA & Performance
    add_header Service-Worker-Allowed "/";
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;
    add_header Pragma "no-cache" always;
    add_header Expires "0" always;
    
    # 🗂️ Service Worker (pas de cache pour SW)
    location = /sw-mobile.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Service-Worker-Allowed "/";
        try_files \$uri =200;
    }
    
    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Service-Worker-Allowed "/";
        try_files \$uri =200;
    }
    
    # 📱 Manifest PWA
    location = /manifest.json {
        add_header Cache-Control "no-cache";
        add_header Content-Type "application/manifest+json";
        try_files \$uri =200;
    }
    
    # 🖼️ Images avec support WebP et cache agressif
    location ~* \.(jpg|jpeg|png|gif|ico|svg|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept;
        
        # Servir WebP si supporté
        location ~ \.jpg$ {
            add_header Vary Accept;
        }
    }
    
    # 📦 JavaScript & CSS avec cache et compression
    location ~* \.(js|css)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        
        # Fichiers compressés
        gzip_static on;
        brotli_static on;
        add_header Vary Accept-Encoding;
    }
    
    # 🗂️ Fichiers statiques
    location ~* \.(woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Access-Control-Allow-Origin "*";
    }
    
    # 🔄 Routing React (fallback vers index.html)
    location / {
        try_files \$uri \$uri/ /index.html;
        
        # Cache HTML court pour permettre les mises à jour
        location = /index.html {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
    }
    
    # 🔐 Sécurité avancée
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    
    # 🚀 Compression Brotli & Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        image/svg+xml;
    
    # 📡 API Proxy (si votre backend est sur le même serveur)
    location /api {
        proxy_pass http://localhost:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

echo ""
log_info "📋 Commandes à exécuter sur le VPS:"
echo "   # 1. Activer le site"
echo "   sudo ln -s /etc/nginx/sites-available/depotmanager /etc/nginx/sites-enabled/"
echo ""
echo "   # 2. Tester la configuration"
echo "   sudo nginx -t"
echo ""
echo "   # 3. Recharger Nginx"
echo "   sudo systemctl reload nginx"
echo ""
echo "   # 4. Installer SSL (Let's Encrypt)"
echo "   sudo apt install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d $DOMAIN"
echo ""
echo "   # 5. Vérifier les fichiers PWA"
echo "   ls -la $VPS_PATH/sw-mobile.js"
echo "   ls -la $VPS_PATH/manifest.json"
echo ""
log_info "🌐 Votre application PWA sera accessible sur: https://$DOMAIN"
echo ""
log_warning "⚠️  N'oubliez pas de configurer votre domaine DNS vers $VPS_IP"
echo ""
log_success "✨ Déploiement PWA & Performance terminé avec succès !"

# ========================================
# ÉTAPE 6: Vérification post-déploiement
# ========================================
echo ""
log_info "🔍 Tests de vérification recommandés:"
echo "   curl -I https://$Domain/sw-mobile.js"
echo "   curl -I https://$Domain/manifest.json"
echo "   curl -I https://$Domain/"
echo ""
log_info "📱 Test PWA sur mobile:"
echo "   1. Ouvrir https://$Domain sur mobile"
echo "   2. Vérifier le bouton 'Installer l'application'"
echo "   3. Tester le mode hors ligne"
echo "   4. Vérifier les notifications"
echo ""
