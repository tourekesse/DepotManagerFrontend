#!/usr/bin/env bash
set -euo pipefail

VPS_HOST="root@62.72.24.153"
VPS_BASE="/home/depotmanager"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR"
BACKEND_DIR="$(cd "$ROOT_DIR/../depotmanager-backend" && pwd)"
TMP_DIR="/tmp/depotmanager-partial-deploy"

FRONT_ARCHIVE="depotmanager-frontend-nos-changements.tar.gz"
BACK_ARCHIVE="depotmanager-backend-nos-changements.tar.gz"

FRONT_FILES=(
  "index.html"
  "public/sw-mobile.js"
  "src/App.jsx"
  "src/views/pages/livraison/LivraisonList.jsx"
  "src/views/pages/vente/BoissonApp.jsx"
  "src/views/pages/vente/CartModal.jsx"
  "src/views/pages/vente/CommandeDepotList.jsx"
)

BACK_FILES=(
  "src/main/java/com/toure/depotmanager/service/FactureWhatsAppService.java"
  "src/main/java/com/toure/depotmanager/controller/PanierController.java"
)

echo "==> Préparation du dossier temporaire"
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR/frontend" "$TMP_DIR/backend"

echo "==> Vérification des fichiers frontend"
for file in "${FRONT_FILES[@]}"; do
  test -f "$FRONTEND_DIR/$file" || { echo "Fichier frontend introuvable: $file"; exit 1; }
done

echo "==> Vérification des fichiers backend"
for file in "${BACK_FILES[@]}"; do
  test -f "$BACKEND_DIR/$file" || { echo "Fichier backend introuvable: $file"; exit 1; }
done

echo "==> Compilation backend locale"
(cd "$BACKEND_DIR" && mvn -q -DskipTests compile)

echo "==> Création archive frontend partielle"
(cd "$FRONTEND_DIR" && tar -czf "$TMP_DIR/$FRONT_ARCHIVE" "${FRONT_FILES[@]}")

echo "==> Création archive backend partielle"
(cd "$BACKEND_DIR" && tar -czf "$TMP_DIR/$BACK_ARCHIVE" "${BACK_FILES[@]}")

echo "==> Envoi des archives vers le VPS"
scp "$TMP_DIR/$FRONT_ARCHIVE" "$TMP_DIR/$BACK_ARCHIVE" "$VPS_HOST:$VPS_BASE/"

echo "==> Déploiement sur le VPS et rebuild Docker"
ssh "$VPS_HOST" bash -s <<'REMOTE_SCRIPT'
set -euo pipefail

VPS_BASE="/home/depotmanager"
FRONT_ARCHIVE="depotmanager-frontend-nos-changements.tar.gz"
BACK_ARCHIVE="depotmanager-backend-nos-changements.tar.gz"

cd "$VPS_BASE"

echo "==> Vérification des dossiers VPS"
test -d "$VPS_BASE/frontend" || { echo "Dossier manquant: $VPS_BASE/frontend"; exit 1; }
test -d "$VPS_BASE/backend" || { echo "Dossier manquant: $VPS_BASE/backend"; exit 1; }

echo "==> Nettoyage ancien build/dist frontend"
rm -rf "$VPS_BASE/frontend/build" "$VPS_BASE/frontend/dist"

echo "==> Extraction frontend"
tar -xzf "$VPS_BASE/$FRONT_ARCHIVE" -C "$VPS_BASE/frontend"

echo "==> Extraction backend"
tar -xzf "$VPS_BASE/$BACK_ARCHIVE" -C "$VPS_BASE/backend"

echo "==> Nettoyage contenu live nginx du conteneur frontend si présent"
if docker ps --format '{{.Names}}' | grep -qx 'depotmanager-frontend'; then
  docker exec depotmanager-frontend rm -rf /usr/share/nginx/html/* || true
fi

echo "==> Rebuild Docker frontend"
docker compose build --no-cache depotmanager-frontend

echo "==> Rebuild Docker backend"
docker compose build --no-cache depotmanager-backend

echo "==> Redémarrage Docker Compose"
docker compose up -d

echo "==> Conteneurs actifs"
docker ps
REMOTE_SCRIPT

echo "==> Déploiement terminé"
