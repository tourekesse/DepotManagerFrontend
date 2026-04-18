#!/bin/bash

# ========================================
# DÉPLOIEMENT RAPIDE - One Command Deploy
# ========================================

set -e

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
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

# Vérifier si on est dans le bon dossier
if [ ! -f "package.json" ]; then
    log_error "Veuillez exécuter ce script depuis le dossier racine du projet"
    exit 1
fi

log_info "🚀 Déploiement rapide de DepotManager Frontend..."

# Étape 1: Nettoyage
log_info "🧹 Nettoyage du build précédent..."
rm -rf build/ dist/ 2>/dev/null || true

# Étape 2: Installation des dépendances (si nécessaire)
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    log_info "📦 Installation des dépendances..."
    npm install
fi

# Étape 3: Build
log_info "🏗️  Build de production..."
npm run build

# Étape 4: Vérification du build
if [ ! -d "build" ]; then
    log_error "❌ Le build a échoué - dossier build non trouvé"
    exit 1
fi

# Étape 5: Déploiement (si le script deploy.sh existe)
if [ -f "deploy.sh" ]; then
    log_info "🚀 Lancement du déploiement sur le serveur..."
    bash deploy.sh
    log_success "✅ Déploiement terminé!"
else
    log_warning "⚠️  Script deploy.sh non trouvé - build uniquement"
    log_info "📦 Build disponible dans le dossier ./build"
fi

log_success "🎉 Opération terminée avec succès!"
