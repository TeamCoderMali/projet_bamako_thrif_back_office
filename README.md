# 🛍️ DANAYA Back Office — Documentation Complète

> Tableau de bord d'administration pour la plateforme **DANAYA** — marketplace de vêtements et accessoires au Mali.

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Prérequis](#prérequis)
4. [Installation & Démarrage](#installation--démarrage)
5. [Structure du projet](#structure-du-projet)
6. [Firebase & Firestore](#firebase--firestore)
7. [Authentification & Rôles](#authentification--rôles)
8. [Pages & Fonctionnalités](#pages--fonctionnalités)
9. [Compte Admin par défaut](#compte-admin-par-défaut)
10. [Déploiement](#déploiement)
11. [Troubleshooting](#troubleshooting)

---

## Vue d'ensemble

Le **DANAYA Back Office** est une application Angular autonome dédiée à l'administration de la plateforme DANAYA. Il s'agit d'un projet **entièrement séparé** de l'application mobile Flutter.

```
┌─────────────────────────────────────────────────────────┐
│                    DANAYA Platform                      │
├──────────────────────┬──────────────────────────────────┤
│   App Mobile Flutter │     Back Office (ce projet)      │
│   (Utilisateurs)     │     (Admins & Point Relais)      │
│                      │                                  │
│         ↕            │           ↕                      │
│              Firebase (Auth + Firestore + Storage)      │
└─────────────────────────────────────────────────────────┘
```

> ⚠️ **Important** : Ce dashboard communique **directement** avec Firebase, sans backend intermédiaire (pas de Spring Boot, pas d'API REST). Les données sont partagées avec l'app Flutter via Firestore.

---

## Architecture

| Couche | Technologie |
|--------|-------------|
| Framework | Angular 20 (Standalone Components) |
| Langage | TypeScript |
| Styles | SCSS (Vanilla, sans Tailwind) |
| Backend | Firebase (AngularFire SDK) |
| Auth | Firebase Authentication |
| Base de données | Cloud Firestore |
| Stockage | Firebase Storage |
| Réactivité | Angular Signals |
| Routing | Angular Router (lazy loading) |

---

## Prérequis

- **Node.js** v18 ou supérieur
- **npm** v9 ou supérieur
- **Angular CLI** v20 : `npm install -g @angular/cli`
- **Firebase CLI** : `npm install -g firebase-tools`
- Accès au projet Firebase `bamako-thrif`

---

## Installation & Démarrage

```bash
# 1. Accéder au dossier
cd admin-dashboard

# 2. Installer les dépendances
npm install

# 3. Démarrer le serveur de développement
npm run start
# → Ouvrir http://localhost:4200
```

### Build production

```bash
npm run build
# Fichiers dans dist/admin-dashboard/
```

### Configuration Firebase

Fichiers de configuration : `src/environments/environment.ts`

```typescript
export const environment = {
  firebase: {
    apiKey: "AIzaSyBWL6eifzR4QmaPH7vh5oxsJ9ExXKlXyjw",
    authDomain: "bamako-thrif.firebaseapp.com",
    projectId: "bamako-thrif",
    storageBucket: "bamako-thrif.firebasestorage.app",
    messagingSenderId: "84148343844",
    appId: "1:84148343844:web:9a6c388d7ab37e558834b1",
  }
};
```

---

## Structure du projet

```
admin-dashboard/
├── src/
│   ├── app/
│   │   ├── app.ts                    ← Composant racine (splash screen auth)
│   │   ├── app.config.ts             ← Providers Firebase + Router
│   │   └── app.routes.ts             ← Toutes les routes (lazy loading)
│   │
│   ├── core/
│   │   ├── auth/
│   │   │   ├── auth.service.ts       ← Authentification (Signals)
│   │   │   └── auth.models.ts        ← Interfaces AdminUser, UserRole
│   │   ├── guards/
│   │   │   ├── auth.guard.ts         ← Guard réactif (attend Firebase init)
│   │   │   └── role.guard.ts         ← Guard de rôle
│   │   └── services/
│   │       ├── data.service.ts       ← Service Firestore principal
│   │       └── toast.service.ts      ← Notifications toast
│   │
│   ├── layout/
│   │   ├── admin-layout/             ← Layout pour les admins
│   │   └── relay-layout/             ← Layout pour les points relais
│   │
│   ├── features/
│   │   ├── authentication/login/     ← Page de connexion
│   │   ├── dashboard/
│   │   │   ├── admin-dashboard/      ← Dashboard admin (KPIs)
│   │   │   └── relay-dashboard/      ← Dashboard point relais
│   │   ├── articles/
│   │   │   ├── list/                 ← Liste des articles
│   │   │   ├── detail/               ← Détail article + modération
│   │   │   └── relay/                ← Articles reçus (point relais)
│   │   ├── users/
│   │   │   ├── list/                 ← Liste des utilisateurs
│   │   │   └── detail/               ← Profil + ban/unban
│   │   ├── orders/
│   │   │   └── orders-history.ts     ← Historique des commandes
│   │   ├── relay-centers/            ← Points relais (CRUD)
│   │   ├── disputes/
│   │   │   ├── disputes.component.ts ← Litiges admin
│   │   │   └── relay/                ← Non-conformités relais
│   │   ├── finance/                  ← Finances + transactions
│   │   ├── reports/
│   │   │   ├── reports.component.ts  ← Statistiques admin
│   │   │   └── relay/                ← Historique relais
│   │   └── settings/
│   │       ├── settings.component.ts ← Paramètres plateforme
│   │       ├── admin-accounts/       ← Comptes administrateurs
│   │       └── relay/                ← Profil point relais
│   │
│   ├── shared/
│   │   ├── components/
│   │   │   ├── page-header/          ← En-tête de page
│   │   │   ├── stat-card/            ← Carte KPI avec icône
│   │   │   ├── status-badge/         ← Badge de statut
│   │   │   └── skeleton-loader/      ← Placeholder chargement
│   │   └── pipes/
│   │       └── time-ago.pipe.ts      ← "Il y a 2h", "Hier"…
│   │
│   ├── styles.scss                   ← Styles globaux + variables CSS
│   └── environments/                 ← Config Firebase
│
├── scripts/
│   └── seed-admin.js                 ← Script création admin
└── README.md                         ← Ce fichier
```

---

## Firebase & Firestore

### Collections Firestore

| Collection | Description | Accès Admin |
|------------|-------------|-------------|
| `product` | Articles publiés | ✅ Lecture + Modération |
| `users` | Profils utilisateurs | ✅ Lecture + Ban |
| `order` | Commandes | ✅ Lecture complète |
| `wallet` | Portefeuilles utilisateurs | ✅ Lecture |
| `transactions` | Historique financier | ✅ Lecture |
| `admin_users` | Comptes administrateurs | ✅ CRUD complet |
| `relay_centers` | Points relais | ✅ CRUD complet |
| `disputes` | Litiges | ✅ Lecture + Résolution |
| `non_conformities` | NC des relais | ✅ Lecture complète |
| `app_settings` | Config plateforme | ✅ Lecture + Écriture |
| `chat` | Messages | ❌ Privé utilisateurs |
| `notification` | Notifications | ❌ Privé utilisateurs |

### Règles de sécurité Firestore

Les admins ont **accès complet** via une règle wildcard :

```javascript
function isAdmin() {
  return isAuthenticated()
    && exists(/databases/$(database)/documents/admin_users/$(request.auth.uid));
}

// Accès total pour les admins
match /{document=**} {
  allow read, write: if isAdmin();
}
```

Pour déployer les règles mises à jour :

```bash
cd "Projet Bamako Thrif"
firebase deploy --only firestore:rules --project bamako-thrif
```

---

## Authentification & Rôles

### Rôles disponibles

```typescript
type UserRole = 'admin' | 'relay_manager';
```

| Rôle | Accès | Redirect après login |
|------|-------|---------------------|
| `admin` | Dashboard complet | `/admin/dashboard` |
| `relay_manager` | Dashboard relais uniquement | `/relay/dashboard` |

### Guards réactifs (fix déconnexion)

Les guards attendent la **fin de l'init Firebase Auth** avant de décider :

```typescript
// authGuard — attend que isLoading devienne false
return toObservable(auth.isLoading).pipe(
  filter(loading => !loading),
  take(1),
  map(() => auth.isAuthenticated() ? true : router.createUrlTree(['/login']))
);
```

Cela résout le problème de déconnexion au rafraîchissement de page.

---

## Pages & Fonctionnalités

### 🛡️ Espace Administrateur

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/admin/dashboard` | KPIs globaux, activité récente |
| Articles | `/admin/articles` | Liste + filtres + modération |
| Détail article | `/admin/articles/:id` | Galerie, vendeur, modération |
| Utilisateurs | `/admin/users` | Liste + ban/unban |
| Détail utilisateur | `/admin/users/:id` | Profil + articles + commandes |
| **Historique** | `/admin/history` | Toutes les commandes (filtres, pagination) |
| Points Relais | `/admin/relay-centers` | CRUD complet |
| Finances | `/admin/finances` | CA, transactions, stats |
| Litiges | `/admin/disputes` | Workflow résolution |
| Statistiques | `/admin/reports` | Graphiques + KPIs |
| Paramètres | `/admin/settings` | Config plateforme |
| Comptes Admin | `/admin/admin-accounts` | Créer/supprimer admins |

### 🏪 Espace Point Relais

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/relay/dashboard` | Stats du relais |
| Articles | `/relay/articles` | Articles à traiter |
| Non-conformités | `/relay/non-conformities` | Signaler des problèmes |
| **Historique** | `/relay/history` | Articles traités |
| Mon profil | `/relay/profile` | Modifier les infos |

---

## Compte Admin par défaut

```
Email    : admin@danaya.ml
Mot de passe : password123
Rôle     : admin
```

> ⚠️ **Changer le mot de passe** dès le premier accès !

### Créer un nouvel admin depuis l'interface

1. Se connecter en tant qu'admin
2. Aller dans **Paramètres → Comptes Admin**
3. Cliquer **Créer un compte**
4. Remplir : nom, email, mot de passe, rôle

### Supprimer un compte admin

Même page, cliquer l'icône poubelle. Il est impossible de supprimer le compte avec lequel on est connecté.

---

## Déploiement

### Firebase Hosting

```bash
# Build production
cd admin-dashboard
npm run build

# Déployer
firebase deploy --only hosting --project bamako-thrif
```

### Mettre à jour les règles Firestore

```bash
cd "Projet Bamako Thrif"
firebase deploy --only firestore:rules --project bamako-thrif
```

---

## Troubleshooting

### ❌ Déconnexion au rafraîchissement

**Cause** : Le guard s'exécutait avant que Firebase restaure la session.
**Fix** : Guards réactifs avec `toObservable(auth.isLoading)`.

---

### ❌ Articles/Utilisateurs ne chargent pas

**Vérifications** :
1. Ouvrir F12 → Console → logs `[DataService]`
2. Vérifier que l'utilisateur a un doc dans `admin_users` dans Firestore
3. Redéployer les règles si nécessaire

---

### ❌ Création de point relais échoue

**Cause** : Règles Firestore manquantes pour `relay_centers`.
**Fix** : Règle `isAdmin()` ajoutée — redéployer si ce n'est pas fait.

---

### ❌ Statistiques montrent une erreur

**Cause** : `getCountFromServer` nécessitait des permissions spéciales.
**Fix** : Remplacé par `getDocs().size` partout.

---

### ❌ "Cannot find name 'getCountFromServer'"

Import supprimé mais encore utilisé. Tout a été remplacé par `getDocs`.

---

## 🎨 Design System

| Token | Valeur | Usage |
|-------|--------|-------|
| `--color-primary` | `#6B7F4D` | Couleur principale |
| `--color-primary-dark` | `#4f6035` | Hover / actif |
| `--card-bg` | `#ffffff` | Fond des cartes |
| `--color-bg` | `#f0f2f5` | Fond général |
| `--shadow-sm` | `0 1px 3px…` | Ombre légère |
| `--shadow-md` | `0 4px 16px…` | Ombre hover |
| `--sidebar-bg` | `#0d1117` | Sidebar (dark always) |

**Police** : `Inter` — 400 / 500 / 600 / 700 / 800

---

*DANAYA Back Office — Administration de la plateforme Bamako Thrif 🇲🇱*
