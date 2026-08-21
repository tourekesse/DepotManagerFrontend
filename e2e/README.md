# DepotManager — Démo E2E (Playwright + TypeScript)

Script d'automatisation du parcours complet de démo, avec enregistrement vidéo
**HD 1280×720** en `.webm`.

## Parcours automatisé

1. Accueil → bouton **Commencer** (route `/essai`)
2. Formulaire **Essai Gratuit 14 jours** → *Créer mon compte*
3. Message d'inscription réussie → `/register-success`
4. **Activation du compte** : lecture du `verification_token` en DB + requête
   directe au backend `/api/auth/verify-email?token=...` (aucune ouverture de Gmail)
5. **Connexion** (*Se connecter*)
6. **Onboarding Bar** : pays CI par défaut, nom/téléphone/quartier → *Créer mon bar*
7. Tableau de bord `/accueil` (pause finale pour capturer la vidéo)

## Prérequis

- Node.js ≥ 18
- MySQL accessible (pour lire le token d'activation) — les identifiants VPS
  sont fournis dans `.env`.

## Installation

```bash
cd e2e
cp .env.example .env        # puis remplir si besoin
npm install
npx playwright install chromium
```

## Lancement

```bash
cd e2e
npm run demo               # sans interface (recommandé pour la vidéo)
npm run demo:headed         # avec navigateur visible
```

La vidéo est écrite dans `e2e/test-results/` (le fichier `demo.webm` de chaque
run). Les captures d'écran (échec uniquement) et le trace sont aussi sauvés.

## Configuration

| Variable   | Rôle                                     | Défaut                     |
|------------|------------------------------------------|----------------------------|
| `APP_URL`  | URL de l'application                     | `https://depotmanager.gm-soft.ca` |
| `DEMO_EMAIL`| Email de démo (un `+stamp` est ajouté)  | `demo.bar+<stamp>@example.com` |
| `DEMO_PASSWORD` | Mot de passe de démo               | `Demo@2026!`               |
| `DB_*`      | Accès MySQL (lecture du token)           | VPS DepotManager           |

## Note importante

L'activation e-mail étant **obligatoire** (par choix métier), la démo ne passe
pas par l'ouverture de Gmail : le token est lu directement en base puis on
appelle l'endpoint `/api/auth/verify-email` via une requête HTTP. Cela
reproduit fidèlement le clic sur le lien reçu par e-mail, sans exposition du
courrier à l'écran.