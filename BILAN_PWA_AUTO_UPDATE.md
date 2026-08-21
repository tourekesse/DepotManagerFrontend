# Bilan - Mise a jour automatique PWA

Date: 2026-06-17

## Objectif

Mettre en place une strategie 100% frontend pour forcer les clients a recevoir automatiquement les nouvelles versions de l'application, sans intervention manuelle et sans modification de l'infrastructure Nginx en production.

## Constat initial

Le projet n'utilise pas actuellement `vite-plugin-pwa`.

La PWA repose sur un service worker manuel:

```text
public/sw-mobile.js
```

Donc l'integration directe de:

```js
VitePWA({ ... })
```

dans `vite.config.js` aurait casse la build sans ajout prealable de dependance.

## Strategie appliquee

Une strategie equivalente a `autoUpdate` a ete implementee avec le service worker existant.

## Fichiers modifies

```text
src/main.jsx
src/App.jsx
public/sw-mobile.js
```

## Details des changements

### 1. `src/main.jsx`

Ajout d'un enregistrement centralise du service worker en production.

Comportements ajoutes:

- Enregistrement de `/sw-mobile.js` avec `updateViaCache: 'none'`.
- Detection automatique d'un nouveau service worker.
- Envoi de `skipWaiting` au nouveau service worker.
- Rechargement automatique de la page via `controllerchange`.
- Verification active toutes les 10 minutes avec:

```js
registration.update()
```

Objectif: contourner autant que possible le cache navigateur/Nginx et detecter les nouvelles versions sans action utilisateur.

### 2. `src/App.jsx`

Suppression de l'ancien enregistrement du service worker.

Avant, `App.jsx` affichait une confirmation utilisateur du type:

```text
Une nouvelle version est disponible. Recharger maintenant ?
```

Ce comportement a ete retire pour rendre la mise a jour transparente.

### 3. `public/sw-mobile.js`

Version du cache mise a jour:

```js
v2.0.2
```

Ajouts/renforcements:

- `self.skipWaiting()` force pendant l'installation.
- `clients.claim()` conserve pendant l'activation.
- Support explicite des messages:

```js
'skipWaiting'
```

et:

```js
{ type: 'SKIP_WAITING' }
```

## Resultat attendu

Apres deploiement frontend:

- Les clients deja connectes verifieront automatiquement la presence d'une nouvelle version toutes les 10 minutes.
- Si une nouvelle version est detectee, le nouveau service worker s'active immediatement.
- La page se recharge automatiquement.
- L'utilisateur n'a pas besoin de vider le cache.
- L'utilisateur n'a pas besoin de fermer/reouvrir l'application.
- Aucune intervention Nginx n'est necessaire.

## A redeployer

Pour que cette correction soit active en production, redeployer le frontend avec au minimum ces fichiers:

```text
src/main.jsx
src/App.jsx
public/sw-mobile.js
```

## Notes importantes

Cette correction ne modifie pas l'infrastructure Docker ou Nginx.

Elle ne remplace pas une configuration cache ideale cote serveur, mais elle permet une mise a jour automatique dans le contexte actuel ou Nginx ne doit pas etre touche.

Si plus tard l'infrastructure peut etre modifiee, il faudra idealement ajouter des headers anti-cache pour:

```text
/sw-mobile.js
/manifest.json
```

et conserver un cache long uniquement sur les assets hashes dans `static/`.
