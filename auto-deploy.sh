#!/bin/bash

# ========================================
# SCRIPT DE SURVEILLANCE ET DÉPLOIEMENT AUTOMATIQUE
# ========================================

set -e

# Configuration
WATCH_DIR="./src"
DEPLOY_SCRIPT="./deploy.sh"
CHECK_INTERVAL=30  # Vérifier toutes les 30 secondes

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[AUTO-DEPLOY]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Obtenir le hash le plus récent des fichiers source
get_last_hash() {
    find "$WATCH_DIR" -type f \( -name "*.jsx" -o -name "*.js" -o -name "*.css" \) -exec md5sum {} \; | sort | md5sum | cut -d' ' -f1
}

log_info "🚀 Démarrage de la surveillance automatique..."
log_info "📁 Dossier surveillé: $WATCH_DIR"
log_info "⏱️  Intervalle: $CHECK_INTERVAL secondes"

# Hash initial
LAST_HASH=$(get_last_hash)
log_info "🔍 Hash initial: $LAST_HASH"

# Boucle de surveillance
while true; do
    sleep $CHECK_INTERVAL
    
    CURRENT_HASH=$(get_last_hash)
    
    if [ "$CURRENT_HASH" != "$LAST_HASH" ]; then
        log_warning "📝 Changements détectés!"
        log_info "🔄 Lancement du déploiement automatique..."
        
        # Lancer le déploiement
        if [ -f "$DEPLOY_SCRIPT" ]; then
            bash "$DEPLOY_SCRIPT"
            if [ $? -eq 0 ]; then
                log_success "✅ Déploiement terminé avec succès!"
            else
                log_warning "⚠️  Le déploiement a échoué"
            fi
        else
            log_warning "⚠️  Script de déploiement non trouvé: $DEPLOY_SCRIPT"
        fi
        
        # Mettre à jour le hash
        LAST_HASH=$CURRENT_HASH
        log_info "🔍 Nouveau hash: $LAST_HASH"
        log_info "⏱️  Reprise de la surveillance..."
    fi
done
