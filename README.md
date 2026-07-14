# 🚕 TaxiLibre - Plateforme VTC Global

## 📋 Description

TaxiLibre est une plateforme de réservation de taxi complète et professionnelle, similaire à Uber et Bolt. Elle permet aux passagers de réserver des courses en temps réel, aux conducteurs de recevoir des demandes de courses, et aux administrateurs de gérer l'ensemble du système.

## 🌐 Applications en Production

| Application | URL |
|---|---|
| 👥 Passagers | https://passenger-web-sigma.vercel.app/ |
| 🚗 Conducteurs | https://driver-web-alpha.vercel.app/ |
| 📊 Admin Dashboard | https://admin-dashboard-sandy-theta.vercel.app/ |

## 🏗️ Architecture

### Monorepo Structure
```
taxilibre/
├── apps/
│   ├── passenger-web/          # Application Passagers (React + Vite)
│   ├── driver-web/             # Application Conducteurs (React + Vite)
│   ├── admin-dashboard/        # Dashboard Admin (React + Vite)
│   └── mobile/                 # Application Mobile (React Native)
├── backend/                    # API Backend (Node.js + Express)
├── gateway-nginx/              # Nginx Gateway pour production
├── shared/                     # Code partagé entre les applications
└── infrastructure/            # Configuration infrastructure
```

### Tech Stack

**Frontend:**
- React 18.2.0
- Vite 4.3.9
- TailwindCSS 3.3.0
- React Router DOM 6.13.0
- Socket.io Client 4.6.1
- Leaflet + React-Leaflet (Maps)
- Zustand (State Management)
- Axios (HTTP Client)

**Backend:**
- Node.js 18+
- Express.js 4.18.2
- PostgreSQL (Supabase)
- Redis (Caching)
- Socket.io 4.7.2 (Real-time)
- JWT Authentication
- Stripe 14.9.0 (Payments)
- Twilio 4.19.0 (SMS)
- Firebase Admin 10.3.0 (Push Notifications)

**DevOps:**
- Docker & Docker Compose
- Vercel (Frontend Deployment)
- GitHub Actions (CI/CD)

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 18+
- npm 9+
- Docker & Docker Compose
- PostgreSQL (Supabase)
- Redis

### Installation

```bash
# Cloner le repository
git clone https://github.com/shopdstok/taxilibre2.git
cd taxilibre

# Installer les dépendances
npm install

# Installer les dépendances de chaque application
cd apps/passenger-web && npm install
cd ../driver-web && npm install
cd ../admin-dashboard && npm install
cd ../../backend && npm install
```

### Configuration

```bash
# Copier les fichiers d'environnement
cp backend/.env.example backend/.env
cp apps/passenger-web/.env.example apps/passenger-web/.env
cp apps/driver-web/.env.example apps/driver-web/.env
cp apps/admin-dashboard/.env.example apps/admin-dashboard/.env

# Configurer les variables d'environnement
# Voir section Configuration ci-dessous
```

### Lancement en Développement

```bash
# Lancer toutes les applications
npm run dev

# Ou lancer individuellement
npm run dev:backend      # Backend sur http://localhost:3003
npm run debug:backend    # Backend en mode debug (port 9229)
npm run dev:passenger   # Passagers sur http://localhost:3000
npm run dev:driver      # Conducteurs sur http://localhost:3001
npm run dev:admin       # Admin sur http://localhost:3002
```

### Lancement avec Docker

```bash
# Lancer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter les services
docker-compose down
```

## ⚙️ Configuration

### Backend (.env)
```env
NODE_ENV=development
PORT=3003
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_test_...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
FIREBASE_PROJECT_ID=...
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3003
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_GOOGLE_MAPS_API_KEY=...
```

## 📱 Fonctionnalités

### Passagers
- ✅ Géolocalisation en temps réel
- ✅ Réservation de courses
- ✅ Suivi du conducteur
- ✅ Paiement intégré (Stripe)
- ✅ Historique des trajets
- ✅ Notation des conducteurs

### Conducteurs
- ✅ Tableau de bord en ligne/hors ligne
- ✅ Réception des demandes de courses
- ✅ Navigation GPS
- ✅ Suivi des gains
- ✅ Gestion du profil
- ✅ Historique des courses

### Admin Dashboard
- ✅ Analytics et statistiques
- ✅ Gestion des utilisateurs
- ✅ Gestion des conducteurs
- ✅ Modération
- ✅ Gestion des paiements
- ✅ Support tickets

## 🧪 Tests

```bash
# Lancer les tests backend
cd backend
npm test

# Lancer les tests avec coverage
npm run test:coverage

# Lancer les tests en mode watch
npm run test:watch
```

## 📦 Build pour Production

```bash
# Build de toutes les applications
npm run build

# Build individuel
npm run build:passenger
npm run build:driver
npm run build:admin
npm run build:backend
```

## 🚢 Déploiement

### Vercel (Frontend)
```bash
# Déployer sur Vercel
vercel --prod
```

### Docker (Backend)
```bash
# Build l'image Docker
docker build -t taxilibre-backend ./backend

# Run le container
docker run -p 3003:3003 taxilibre-backend
```

Voir [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) pour plus de détails.

## 📚 Documentation

- [API Documentation](./docs/API.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Vercel Deployment Status](./VERCEL_DEPLOYMENT_STATUS.md)

## 🔐 Sécurité

- JWT Authentication
- Password hashing (bcrypt)
- Rate limiting
- CORS configuration
- Helmet.js security headers
- Input validation (Joi)
- SQL injection prevention (Sequelize)

## 🤝 Contribution

1. Fork le repository
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.

## 👥 Équipe

- TaxiLibre Team

## 📧 Contact

- Email: contact@taxilibre.com
- Website: https://taxilibre.com

---

**Note:** Ce projet est en développement actif. De nouvelles fonctionnalités sont ajoutées régulièrement.
