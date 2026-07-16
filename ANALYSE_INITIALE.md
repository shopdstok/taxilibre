# TaxiLibre - Analyse Initiale du Monorepo

**Date** : 2026-07-16  
**Auteur** : Lead Software Architect  
**Objet** : Analyse complète du monorepo TaxiLibre avant toute modification.

## 📊 Vue d'ensemble du projet

**Nom** : TaxiLibre  
**Type** : Plateforme VTC globale (similaire à Uber, Bolt)  
**Architecture** : Monorepo avec séparation claire entre backend et frontends  
**Stack technique** : 
- Backend : Node.js/Express, PostgreSQL, Redis, Socket.io, Sequelize
- Frontend : React 18, Vite, TailwindCSS, Zustand, React Query, Socket.io-client, Leaflet
- DevOps : Docker, Docker Compose, GitHub Actions (à venir)
- Services externes : Stripe, Firebase Admin, Twilio, Supabase (hébergement DB), Google Maps

## 🏗️ Architecture générale

Le monorepo est organisé ainsi :

- `/backend` : API Node.js/Express
- `/apps` : Applications frontend
  - `passenger-web` : Application passager
  - `driver-web` : Application conducteur
  - `admin-dashboard` : Tableau de bord admin
  - `mobile` : Application mobile React Native/Expo
- `/shared` : Code partagé entre frontend et backend (actuellement vide ou sous-utilisé)
- `/prisma` : Schéma Prisma (non utilisé dans le backend actuel)
- `/database` : Scripts SQL et migrations
- `/docker-compose.yml` et `docker-compose.prod.yml` : Configuration Docker
- `/nginx` : Configuration Nginx pour le reverse proxy
- `/gateway-nginx` : Configuration supplémentaire de gateway

## 🔧 Backend

### Structure
Le backend suit une architecture en couches :
- `src/controllers` : Contrôleurs Express
- `src/services` : Logique métier
- `src/models` : Modèles Sequelize
- `src/routes` : Définition des routes API
- `src/middleware` : Middlewares personnalisés (auth, validation, erreurs)
- `src/validators` : Schémas de validation (Joi/Zod)
- `src/config` : Configuration (base de données, Stripe, etc.)
- `src/utils` : Utilitaires
- `src/socket` : Gestion Socket.io
- `src/workers` : Tâches asynchrones (Files d'attente)

### Dépendances notables
- **ORM** : Sequelize v6.37.8
- **Logging** : Winston et Pino (redondance)
- **Validation** : Joi, Zod, Express-Validator (redondance)
- **Authentification** : jsonwebtoken, speakeasy (2FA), bcryptjs
- **Paiements** : Stripe
- **Notifications** : Firebase Admin, Twilio (SMS), nodemailer (email)
- **Temps réel** : Socket.io v4.8.3
- **Rate limiting** : express-rate-limit
- **Sécurité** : helmet, cors, compression, permessage-deflate
- **Monitoring** : prom-client
- **Others** : multer (upload), qrcode, ws

### Points forts
- Séparation claire des responsabilités (controllers, services, etc.)
- Utilisation de variables d'environnement via `.env.example`
- Gestion centralisée de la configuration
- Implémentation de l'authentification JWT avec refresh tokens
- Intégration de Socket.io pour les fonctionnalités temps réel
- Gestion des téléchargements de fichiers (multer)
- Documentation API via Swagger/JSDoc (swagger-jsdoc, swagger-ui-express)
- Tests unitaires avec Jest (dossier `__tests__`)

### Points faibles / Détail technique
1. **Redondance des bibliothèques** :
   - Deux systèmes de logging : Winston et Pino
   - Trois bibliothèques de validation : Joi, Zod, Express-Validator
   - Ceci augmente la taille du bundle et la complexité de maintenance.

2. **Console.log en production** :
   - De nombreux `console.log` sont présents dans le code (voir sections ci-dessous), ce qui peut entraîner une fuite d'informations sensibles et dégradation des performances.

3. **Dépendances du racine inappropriées** :
   - Le `package.json` racine déclare des dépendances comme `@prisma/client`, `@supabase/supabase-js`, `firebase-admin`, `stripe`, `uuid`. Ces dépendances devraient être déclarées dans les `package.json` respectifs où elles sont utilisées (backend, frontend, etc.). Cela peut conduire à des conflits de versions et à des installations inutiles.

4. **Scripts d'installation répétés** :
   - Les scripts de développement (`dev:passenger`, `dev:driver`, `dev:admin`) exécutent `npm install` à chaque lancement, ce qui est inefficace et devrait être évité en utilisant un véritable système de monorepo (npm workspaces, pnpm, yarn).

5. **Utilisation de Prisma non justifiée** :
   - Un schéma Prisma existe dans `/prisma` avec un fichier `schema.prisma` et un dossier `migrations`, mais le backend utilise exclusivement Sequelize. Aucune référence à Prisma dans le code backend. Cela représente du code mort et une confusion potentielle.

6. **Gestion des secrets** :
   - Le fichier `.env.example` contient des exemples de clés secrètes (Stripe, Twilio, Google Maps, etc.) qui, bien qu'exemplaires, montrent que le projet s'appuie fortement sur des variables d'environnement. Aucun secret n'est commité (vérifié), mais il faut s'assurer que cela reste le cas.

7. **Redirection des logs SQL** :
   - Dans `src/config/database.js`, le logging de Sequelize est configuré sur `console.log` pour le débogage, ce qui n'est pas approprié en production.

### Recommandations immédiates (sans modification de logique)
- Supprimer les `console.log` et remplacer par un système de logging cohérent (pino ou winston).
- Nettoyer les dépendances inutilisées dans le `package.json` racine.
- Envisager de migrer vers un système de monorepo pour éviter les `npm install` répétés.
- Clarifier l'utilisation de Prisma : soit l'adopter comme ORM unique, soit supprimer les fichiers Prisma inutilisés.
- Standardiser sur une seule bibliothèque de validation (Zod semble être utilisé dans le frontend et partiellement dans le backend).

## 🖥️ Frontends

### Structure commune
Chaque frontend application (passager, conducteur, admin) est créée avec :
- Vite 4 comme outil de build
- React 18
- TypeScript
- TailwindCSS pour le styling
- Zustand pour la gestion d'état
- React Query (ou @tanstack/react-query) pour le cache et la synchronisation des données
- Socket.io-client pour la communication temps réel
- Leaflet + React-Leaflet pour les cartes
- Axios pour les requêtes HTTP
- React Router DOM pour le routing

### Passenger Web (`apps/passenger-web`)
- Dépendances : Voir `package.json` spécifique
- Points forts : Bonne utilisation de React Query, état global avec Zustand, intégration fluide avec Leaflet.
- Points faibles : 
  - Doublon entre `react-query` (v3) et `@tanstack/react-query` (v5) dans les dépendances.
  - Aucune trace de `console.log` ou `TODO` dans le fichier source (vérifié).
  - La taille du `node_modules` est conséquente dû aux doublons.

### Driver Web (`apps/driver-web`)
- Structure similaire à passager-web.
- À vérifier : mêmes observations concernant les doublons de dépendances.

### Admin Dashboard (`apps/admin-dashboard`)
- Admin Dashboard (`apps.`)
-Probablement
