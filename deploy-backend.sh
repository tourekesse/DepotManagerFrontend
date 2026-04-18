#!/bin/bash

# ========================================
# SCRIPT DE DÉPLOIEMENT BACKEND - CORRECTION API
# ========================================

set -e

# Configuration
SSH_USER="root"
SSH_IP="62.72.24.153"
BACKEND_PATH="/var/www"
BACKEND_JAR="DepotManager-1.0.0.jar"
SERVICE_NAME="depotmanager"

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[BACKEND-DEPLOY]${NC} $1"
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

log_info "🚀 Déploiement du backend corrigé..."

# Étape 1: Compiler le backend
log_info "🏗️  Compilation du backend..."
cd /home/toure/Documents/dv2/dev2/depotmanager-backend

if [ ! -f "pom.xml" ]; then
    log_error "❌ pom.xml non trouvé. Êtes-vous dans le bon dossier ?"
    exit 1
fi

# Nettoyage et compilation
mvn clean compile -DskipTests
if [ $? -ne 0 ]; then
    log_error "❌ Erreur de compilation"
    exit 1
fi

# Packaging
mvn package -DskipTests
if [ $? -ne 0 ]; then
    log_error "❌ Erreur de packaging"
    exit 1
fi

# Vérifier si le JAR a été créé
if [ ! -f "target/$BACKEND_JAR" ]; then
    log_error "❌ JAR non trouvé après compilation"
    exit 1
fi

log_success "✅ Backend compilé avec succès"

# Étape 2: Transférer le JAR sur le serveur
log_info "📤 Transfert du JAR vers le serveur..."
scp target/$BACKEND_JAR $SSH_USER@$SSH_IP:$BACKEND_PATH/$BACKEND_JAR.new

if [ $? -ne 0 ]; then
    log_error "❌ Erreur lors du transfert du JAR"
    exit 1
fi

log_success "✅ JAR transféré avec succès"

# Étape 3: Déployer sur le serveur
log_info "🔄 Déploiement sur le serveur..."

# Arrêter le service
ssh $SSH_USER@$SSH_IP "systemctl stop $SERVICE_NAME" || log_warning "Le service n'était peut-être pas démarré"

# Sauvegarder l'ancien JAR
ssh $SSH_USER@$SSH_IP "cd $BACKEND_PATH && cp $BACKEND_JAR $BACKEND_JAR.backup.$(date +%Y%m%d_%H%M%S)" || log_warning "Impossible de sauvegarder l'ancien JAR"

# Remplacer par le nouveau
ssh $SSH_USER@$SSH_IP "cd $BACKEND_PATH && mv $BACKEND_JAR.new $BACKEND_JAR"

# Donner les permissions
ssh $SSH_USER@$SSH_IP "chmod +x $BACKEND_PATH/$BACKEND_JAR"

# Démarrer le service
ssh $SSH_USER@$SSH_IP "systemctl start $SERVICE_NAME"

# Vérifier le statut
sleep 5
SERVICE_STATUS=$(ssh $SSH_USER@$SSH_IP "systemctl is-active $SERVICE_NAME")

if [ "$SERVICE_STATUS" = "active" ]; then
    log_success "✅ Service démarré avec succès"
else
    log_error "❌ Le service n'a pas démarré correctement"
    ssh $SSH_USER@$SSH_IP "systemctl status $SERVICE_NAME"
    exit 1
fi

# Étape 4: Test de l'API
log_info "🧪 Test de l'API corrigée..."
sleep 10

# Test de santé
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "http://$SSH_IP:8085/api/commandes/health")

if [ "$HEALTH_CHECK" = "200" ]; then
    log_success "✅ Endpoint de santé accessible"
else
    log_warning "⚠️  Endpoint de santé non accessible (code: $HEALTH_CHECK)"
fi

# Test des commandes client
API_TEST=$(curl -s -o /dev/null -w "%{http_code}" "http://$SSH_IP:8085/api/commandes?clientId=1")

if [ "$API_TEST" = "200" ]; then
    log_success "✅ API des commandes client corrigée !"
    
    # Afficher un exemple de réponse
    log_info "📋 Exemple de réponse:"
    curl -s "http://$SSH_IP:8085/api/commandes?clientId=1" | head -200
else
    log_warning "⚠️  L'API retourne encore une erreur (code: $API_TEST)"
    log_info "Vérifiez les logs avec: ssh $SSH_USER@$SSH_IP 'journalctl -u $SERVICE_NAME -f --lines=20'"
fi

log_success "🎉 Déploiement terminé !"
log_info "📊 Testez l'API: curl -s 'http://$SSH_IP:8085/api/commandes?clientId=1'"
