#!/bin/bash
set -e

VPS="root@62.72.24.153"
VPS_DIST="/home/depotmanager/frontend/dist"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}[1/3]${NC} Build..."
npm run build

echo -e "${BLUE}[2/3]${NC} Transfert vers VPS..."
ssh $VPS "mkdir -p /tmp/deploy-staging"
tar -cf - -C build . | ssh $VPS "tar -xf - -C /tmp/deploy-staging"
ssh $VPS "rm -rf $VPS_DIST/* && cp -a /tmp/deploy-staging/* $VPS_DIST/ && rm -rf /tmp/deploy-staging"

echo -e "${BLUE}[3/3]${NC} Restart nginx..."
ssh $VPS "docker restart depotmanager-frontend"

echo -e "${GREEN}OK!${NC} https://depotmanager.gm-soft.ca"
