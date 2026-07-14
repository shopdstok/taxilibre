# 🚖 TaxiLibre - Vercel Deployment Guide

## 📋 Prerequisites

Before deploying to Vercel, ensure you have:
- A Vercel account (https://vercel.com/taxilibre2)
- Vercel CLI installed: `npm install -g vercel`
- Git repository with your code pushed to GitHub
- Environment variables configured

## 🚀 Deployment Strategy

Due to the monorepo structure with multiple applications, we recommend deploying each app separately:

### Option 1: Separate Vercel Projects (Recommended)

Each app gets its own Vercel project for better isolation and scaling.

#### 1. Deploy Backend API via Vercel Dashboard (Recommandé)

1. Allez sur https://vercel.com/taxilibre2
2. Cliquez sur "Add New" → "Project"
3. Sélectionnez le dépôt GitHub `shopdstok/taxilibre2`
4. Configurez le projet:
   - **Project Name:** `taxilibre-backend`
   - **Root Directory:** `backend`
   - **Framework Preset:** Other
   - **Build Command:** `npm install`
   - **Output Directory:** `src`
   - **Install Command:** `npm install`
5. Cliquez sur "Deploy"
6. Après le déploiement, allez dans Settings → Environment Variables et ajoutez toutes les variables requises (voir section ci-dessous)
7. Redéployez après avoir configuré les variables

#### 2. Deploy Backend API via Vercel CLI

```bash
cd backend
vercel login
vercel --prod
```

Suivez les prompts:
- Link to existing project or create new
- Set environment variables in Vercel dashboard
- Deploy

#### 3. Deploy Passenger Web (Déjà déployé - passenger-web-sigma.vercel.app)
```bash
cd apps/passenger-web
vercel
```
- Set `VITE_API_URL` to your backend URL
- Deployed as static site

#### 4. Deploy Driver Web (Déjà déployé - driver-web-alpha.vercel.app)
```bash
cd apps/driver-web
vercel
```
- Set `VITE_API_URL` to your backend URL
- Deployed as static site

#### 5. Deploy Admin Dashboard (Déjà déployé - admin-dashboard-sandy-theta.vercel.app)
```bash
cd apps/admin-dashboard
vercel
```
- Set `VITE_API_URL` to your backend URL
- Deployed as static site

### Option 2: Single Project with Sub-domains

Use Vercel's multi-project setup with custom domains:
- `app.taxilibre.com` → Passenger Web
- `driver.taxilibre.com` → Driver Web
- `admin.taxilibre.com` → Admin Dashboard
- `api.taxilibre.com` → Backend API

## 🔧 Variables d'Environnement Requises pour le Backend

### Variables Obligatoires
Ajoutez ces variables dans Settings → Environment Variables sur Vercel:

```bash
NODE_ENV=production
PORT=3003
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=votre-secret-jwt-aleatoire-64-caracteres
JWT_REFRESH_SECRET=votre-secret-refresh-aleatoire-64-caracteres
```

### Variables Optionnelles mais Recommandées

```bash
# Redis (pour le cache et les sessions)
REDIS_URL=redis://host:6379

# Stripe (paiements)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Google Maps
GOOGLE_MAPS_API_KEY=AIza...

# Twilio (SMS)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890

# Firebase (notifications push)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...

# Email (SendGrid/SMTP)
SENDGRID_API_KEY=SG...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe

# URLs Frontend
FRONTEND_URL=https://taxilibre.vercel.app
```

### Comment Générer des Secrets Sécurisés

```bash
# Générer JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Générer JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend Environment Variables
Pour chaque application frontend, configurez:
- `VITE_API_URL=https://your-backend-url.vercel.app/api`
- `VITE_SOCKET_URL=https://your-backend-url.vercel.app`

## 📝 Étapes de Déploiement du Backend

### Étape 1: Via l'Interface Web Vercel (Recommandé)

1. **Accédez à votre compte Vercel**
   - Allez sur https://vercel.com/taxilibre2

2. **Créez un nouveau projet**
   - Cliquez sur "Add New" → "Project"
   - Sélectionnez le dépôt GitHub `shopdstok/taxilibre2`

3. **Configurez le projet backend**
   - **Project Name:** `taxilibre-backend` (ou autre nom de votre choix)
   - **Root Directory:** `backend`
   - **Framework Preset:** Other
   - **Build Command:** `npm install`
   - **Output Directory:** `src`
   - **Install Command:** `npm install`

4. **Déployez**
   - Cliquez sur "Deploy"
   - Attendez que le déploiement se termine

5. **Configurez les variables d'environnement**
   - Allez dans Settings → Environment Variables
   - Ajoutez toutes les variables requises (voir section ci-dessus)
   - Cliquez sur "Save"

6. **Redéployez**
   - Allez dans Deployments
   - Cliquez sur "Redeploy" pour appliquer les variables d'environnement

### Étape 2: Via Vercel CLI

```bash
# Installer Vercel CLI
npm install -g vercel

# Se connecter
vercel login

# Déployer le backend
cd backend
vercel --prod
```

Suivez les prompts:
- Sélectionnez le projet existant ou créez-en un nouveau
- Configurez les variables d'environnement dans le dashboard Vercel
- Redéployez après avoir configuré les variables

## ✅ Vérification du Déploiement

Après le déploiement, testez votre backend:

```bash
# Test du endpoint de santé
curl https://votre-backend-url.vercel.app/health

# Test des endpoints API
curl https://votre-backend-url.vercel.app/api/v1/auth/login
```

Vous devriez recevoir une réponse JSON avec:
```json
{
  "status": "OK",
  "timestamp": "2024-06-28T...",
  "uptime": 123.456
}
```

## 🔍 Dépannage

### Erreur: "Module not found"
- Vérifiez que `package.json` contient toutes les dépendances
- Assurez-vous que `npm install` s'exécute correctement
- Vérifiez la version de Node.js (>=18.0.0 requis)

### Erreur: "Database connection failed"
- Vérifiez que `DATABASE_URL` est correctement configuré
- Assurez-vous que la base de données est accessible depuis Vercel
- Utilisez une base de données PostgreSQL hébergée (Supabase, Neon, etc.)

### Erreur: "JWT_SECRET not configured"
- Ajoutez la variable d'environnement `JWT_SECRET` dans Vercel
- Redéployez après avoir ajouté la variable

### Erreur: "Port already in use"
- Vercel gère automatiquement le port via `PORT` environment variable
- Assurez-vous que votre code utilise `process.env.PORT || 3003`

## 📊 Checklist Post-Déploiement

- [ ] Backend déployé avec succès
- [ ] Variables d'environnement configurées
- [ ] Endpoint `/health` accessible
- [ ] Endpoints API accessibles
- [ ] Connexion à la base de données fonctionnelle
- [ ] Connexion Redis fonctionnelle (si configurée)
- [ ] SSL/HTTPS activé (automatique sur Vercel)
- [ ] Logs de déploiement sans erreurs

## 🚀 Mise à jour des Frontends

Une fois le backend déployé, mettez à jour les variables d'environnement des frontends:

1. Allez sur chaque projet frontend dans Vercel
2. Settings → Environment Variables
3. Mettez à jour `VITE_API_URL` avec l'URL de votre backend déployé
4. Redéployez chaque frontend

## 📚 Ressources Supplémentaires

- [Documentation Vercel](https://vercel.com/docs)
- [Variables d'Environnement Vercel](https://vercel.com/docs/projects/environment-variables)
- [Fonctions Serverless Vercel](https://vercel.com/docs/functions/serverless-functions)

## 🆘 Support

Si vous rencontrez des problèmes:
1. Consultez les logs de déploiement Vercel
2. Vérifiez les erreurs dans la console du navigateur
3. Vérifiez les variables d'environnement
4. Testez les endpoints API directement
5. Consultez les logs backend dans le dashboard Vercel
