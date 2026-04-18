# TODO frontend (2026-02-15)

- [x] `/accueil/bar/catalogue` : Ajout classique par défaut (onglet ProductCreatePage).
- [x] Ajout rapide simplifié : champs visibles = Prix casier (achat), Nb bouteilles/casier, Prix vente unitaire ; calcul automatique du prix d’achat unitaire (casier / nb). Consignes/stock masqués.
- [x] Injection automatique du point de vente actif dans createProduit (fallback localStorage).
- [x] Endpoint `/api/references/recherche` : paramètre `pdvId` optionnel (backend) pour éviter 400.
- [x] Login client BAR renvoie/stoke le point de vente actif (backend + frontend).
- [x] Déploiements frontend successifs (build + deploy.sh) et backend (jar) faits le 2026-02-15.

Note : Pour saisir un casier acheté 3300 vendu 750 unitaire, mettre dans Ajout rapide : Prix casier (achat)=3300, Nb bouteilles=12, Prix vente unitaire=750. Le prix achat unitaire se calcule automatiquement.
