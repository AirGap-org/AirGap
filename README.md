# AirGap - Vos finances ne regardent que vous.

[![pipeline status](https://gitlab.com/Akahira/AirGap/badges/master/pipeline.svg)](https://gitlab.com/Akahira/AirGap/-/commits/master)

Une application web open-source et complète pour gérer vos finances personnelles, développée avec NuxtJs, DrizzleORM, PostgreSQL.

> **Dépôt officiel : [GitLab/Akahira/AirGap](https://gitlab.com/Akahira/AirGap).**
> GitHub n'est conservé que comme archive historique. Les issues, merge requests
> et pipelines se font exclusivement sur GitLab.

## 🚀 Fonctionnalités

### Gestion Financière Complète
- **Tableau de bord interactif** avec visualisations en temps réel
- **Gestion budgétaire** avec suivi des dépenses par catégorie
- **Suivi des transactions** avec catégorisation automatique

### Technologies Utilisées
- **Frontend**: NuxtJs, Vue 3, TailwindCSS, Shadcn
- **Backend**: DrizzleORM, PostgreSQL
- **Visualisations**: Unovis
- **Conteneurisation**: Docker & Docker Compose

### Interface Moderne
- Design épuré et professionnel
- Tableau de bord interactif avec graphiques
- Modales pour l'ajout rapide de données
- Responsive design
- Animations fluides

## 📦 Installation

### Prérequis
- Docker et Docker Compose
- Node.js 22+ (pour le développement local)
- PostgreSQL 15+

### Installation Rapide avec Docker

1. **Cloner le repository**
```bash
git clone https://gitlab.com/Akahira/AirGap.git
cd AirGap
```

2. **Configurer les variables d'environnement**
```bash
cp .env.example .env
# Éditer .env avec vos configurations
```

⚠️ `NUXT_APP_SECRET` et `ENCRYPTION_KEY` doivent être générés avant le premier
lancement. Les valeurs à zéro de `.env.example` sont refusées au démarrage :

```bash
openssl rand -base64 32
```

3. **Lancer l'application avec Docker Compose**
```bash
docker compose up -d
```

4. **Accéder à l'application**
- Application principale: http://localhost:3000
- Base de données: localhost:5432

### Installation pour le Développement

1. **Installer les dépendances**
```bash
npm install
```

2. **Configurer la base de données**

**Nécessite la variable NUXT_DATABASE_URL dans .env**

```bash
npx drizzle-kit migrate
```

3. **Lancer le serveur de développement**
```bash
npm run dev
```

## 🏗️ Architecture du Projet

```
airgap/
├── server/             # API côté serveur
├── app/                # Fichiers de l'app
      ├── pages/        # Pages de l'app
      ├── assets/       # Fichiers styles
      └── components/   # Composants Vue réutilisables
├── public/             # Fichiers statiques
├── docker-compose.yml  # Configuration Docker
├── Dockerfile          # Composants Vue réutilisables
├── package.json        # Dépendances du projet
├── package-lock.json   # Dépendances du projet
├── nuxt.config.js      # Configuration de Nuxt
├── drizzle.config.ts   # Configuration de Drizzle
└── README.md           # Documentation
```

## 🔧 Configuration

### Variables d'Environnement

Créez un fichier `.env` à la racine du projet :

```env
# Database
NUXT_DATABASE_URL=postgresql://airgap_user:airgap_password@localhost:5432/airgap

```

### OAuth (optionnel)

Les boutons OAuth sont masqués tant que les clés ne sont pas configurées. Pour
les activer, utiliser les surcharges runtime (jamais de secret dans l'image) :

```env
NUXT_OAUTH_GOOGLE_CLIENT_ID=...
NUXT_OAUTH_GOOGLE_CLIENT_SECRET=...
NUXT_OAUTH_GITHUB_CLIENT_ID=...
NUXT_OAUTH_GITHUB_CLIENT_SECRET=...
```

Callbacks :

- Google : `https://votre-domaine/auth/google`
- GitHub : `https://votre-domaine/auth/github`

## 📊 Base de Données

### Schéma

La base de données inclut les tables suivantes :
- `users` - Utilisateurs
- `accounts` - Comptes bancaires
- `categories` - Catégories de transactions
- `transactions` - Transactions financières
- `budgets` - Budgets mensuels
- `recurrences` - Gestion des transactions récurrentes
 
### Migration

```bash
# Générer une nouvelle migration
npx drizzle-kit generate

# Exécuter les migrations
npx drizzle-kit migrate

# Ouvrir le studio Drizzle
npx drizzle-kit studio
```

### Tests

⚠️ Les tests d'intégration vident la base ciblée (`TRUNCATE`). Ils refusent de s'exécuter si le nom de la base ne finit pas par `_test`, `_preview` ou `_ci`.

```bash
# Créer une base dédiée
createdb -h localhost -U <user> airgap_test

# Appliquer les migrations puis lancer les tests
NUXT_DATABASE_URL="postgresql://<user>:<password>@localhost:5432/airgap_test" npx drizzle-kit migrate
NUXT_DATABASE_URL="postgresql://<user>:<password>@localhost:5432/airgap_test" npm test
```

La suite inclut des tests E2E HTTP (inscription, login, CRUD transactions/budgets/catégories, import, sécurité) exécutés avec `AI_ENABLED=false`. Pour ne lancer que les E2E :

```bash
NUXT_DATABASE_URL="postgresql://<user>:<password>@localhost:5432/airgap_test" npm run test:e2e
```

## 🚀 CI/CD GitLab

Le pipeline GitLab (`.gitlab-ci.yml`) exécute :

- lint, typecheck, audit et build ;
- les tests avec PostgreSQL 18 ;
- le build et la publication de l'image sur `master` et sur les tags ;
- un `sync-compose` manuel, un backup PostgreSQL et un déploiement **manuel** sur tag.

Images publiées :

- application : `registry.gitlab.com/akahira/airgap`
- service IA : `registry.gitlab.com/akahira/airgap-ai`

En production, utiliser un tag exact, jamais `:latest`.

### Ordre de déploiement d'un tag

1. **`sync-compose`** dans le projet `AirGap` : copie le compose sur le serveur.
2. **`deploy-production`** dans le projet `AirGap-AI` : déploie l'IA et vérifie son healthcheck.
3. **`deploy-production`** dans le projet `AirGap` : sauvegarde PostgreSQL, déploie l'application et vérifie `/api/health`.

Le job `deploy-production` de l'application est bloqué tant que `sync-compose`
n'a pas été lancé.

### Variables CI/CD protégées

Les mêmes variables sont à définir dans **les deux projets GitLab**
(`AirGap` et `AirGap-AI`) :

| Variable | Description |
|---|---|
| `SSH_HOST` | Hôte du serveur de production |
| `SSH_USER` | Utilisateur SSH avec accès à Docker |
| `SSH_PORT` | Port SSH (optionnel, 22 par défaut) |
| `SSH_PRIVATE_KEY` | Clé privée SSH, type **File** |
| `PROD_DIR` | Répertoire du compose sur le serveur, ex. `/app` |

Chaque job de déploiement se connecte au registry avec son propre
`CI_JOB_TOKEN`, via SSH et `--password-stdin`. Aucun token de registry n'est
stocké durablement sur le serveur.

### Exposition HTTP

`AIRGAP_BIND_ADDR` contrôle l'interface d'écoute du port 3000 :

- `127.0.0.1` (défaut) derrière un reverse proxy local ;
- `0.0.0.0` si Cloudflare atteint directement l'IP publique du serveur.

Dans ce second cas, restreindre le port 3000 aux plages d'IP Cloudflare au
niveau du firewall, sinon le port est accessible en contournement du proxy.

### Service IA interne

Le service `AirGap-AI` est hébergé sur GitLab
(`https://gitlab.com/Akahira/AirGap-AI`) et publié dans le registry GitLab.

Il n'expose plus de port public : il est joignable uniquement par le réseau
Docker `airgap_ai_net`, et l'application utilise :

```env
AIRGAP_AI_PREDICT_URL=http://airgap-ai:8000/predire
```

Cela évite que les libellés de transactions transitent par Internet.

⚠️ L'IA doit être déployée après `sync-compose` et avant l'application, avec
`AIRGAP_AI_IMAGE` pointant vers un tag publié. Le job `deploy-production`
d'`AirGap-AI` vérifie que le compose contient bien `airgap_ai_net` avant de
démarrer.

## 🎯 Utilisation

### Première Connexion

1. **Créer un compte utilisateur**
2. **Configurer vos catégories de dépenses**
3. **Définir vos budgets mensuels**

### Fonctionnalités Principales

#### Tableau de Bord
- Vue d'ensemble des finances
- Graphiques de tendances

#### Gestion Budgétaire
- Création de budgets par catégorie
- Suivi en temps réel des dépenses

## 🔒 Sécurité

- Authentification utilisateur + 2FA (TOTP, secret chiffré en base)
- Validation des entrées côté serveur (Zod)
- Sessions sécurisées (secret de session validé au démarrage)
- Chiffrement des données sensibles (AES-256-GCM : descriptions, secret 2FA)
- Rate-limiting / lockout sur l'authentification et la 2FA
- Isolation des données par utilisateur (anti-IDOR)

### ⚠️ Configuration déploiement importante (derrière un reverse proxy)

L'application est conteneurisée et tourne généralement derrière un reverse proxy
(nginx, Traefik, Caddy...). La variable **`TRUST_PROXY_HEADERS`** contrôle la lecture
de l'IP client pour le rate-limiting :

- **`TRUST_PROXY_HEADERS=true`** — à n'activer **QUE** si votre reverse proxy
  **strip** le `X-Forwarded-For` entrant avant de poser le sien. Sans cela, un
  attaquant peut forger cet en-tête et contourner le rate-limit.
- **`TRUST_PROXY_HEADERS=false`** (défaut) — l'IP lue est celle du socket. **Derrière
  un proxy**, tous les utilisateurs apparaissent avec la même IP → le rate-limit
  login verrouille l'application après 5 tentatives échouées cumulées
  (déni de service auto-infligé). Le serveur log un warning au démarrage en
  production si la variable n'est pas définie.

**En production derrière un proxy de confiance** : configurez le proxy pour strip
le XFF entrant, puis passez `TRUST_PROXY_HEADERS=true`.

### Cloudflare derrière une passerelle privée

Si Cloudflare atteint l'origine via une passerelle privée (par exemple
`10.20.0.2`), renseignez son CIDR dans `TRUSTED_PROXY_CIDRS` :

```env
TRUSTED_PROXY_CIDRS=10.20.0.2/32
```

L'IP client est alors lue depuis `CF-Connecting-IP`, mais uniquement si la
connexion TCP vient réellement de cette passerelle. Le port applicatif ne doit
pas être joignable directement depuis Internet.

### Rate-limiting en multi-instance

Le rate-limit utilise le storage Nitro (**en mémoire par défaut**). En
multi-instance (plusieurs containers/PM2), chaque instance a son propre compteur :
un attaquant qui répartit ses requêtes contourne le lockout. Configurez un driver
partagé (Redis) pour le namespace `cache` dans `nuxt.config.js` :

```js
nitro: {
  storage: {
    cache: { driver: 'redis', url: process.env.REDIS_URL }
  }
}
```

Seuils configurables via `RATE_LIMIT_MAX_ATTEMPTS` et `RATE_LIMIT_LOCKOUT_MINUTES`.

### Sauvegardes PostgreSQL

Le script `scripts/backup-prod.sh` sauvegarde la base dans `/app/backups`, vérifie
l'intégrité du gzip et supprime les fichiers de plus de 30 jours.

Exemple de cron quotidien :

```cron
0 3 * * * deploy /usr/local/sbin/airgap-backup
```

La restauration doit être testée régulièrement sur une base dédiée.

## 📱 Responsive Design

L'application est entièrement responsive et fonctionne sur :
- Desktop (1920px+)
- Tablette (768px - 1024px)
- Mobile (320px - 768px)

## 📄 Licence

Ce projet est sous licence AGPLv3. Voir le fichier LICENSE pour plus de détails.

## 🆘 Support

Pour toute question ou problème :
- Ouvrez une issue sur GitLab : https://gitlab.com/Akahira/AirGap/-/issues
- Consultez la documentation
- Contactez l'équipe de support sur Discord

---

**AirGap** - Vos finances ne regardent que vous.
