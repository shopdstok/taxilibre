# 🚕 TaxiLibre - Plateforme VTC Global

## 📋 Description

TaxiLibre est une plateforme de réservation de taxi complète et professionnelle, similaire à Uber et Bolt. Elle permet aux passagers de réserver des courses en temps réel, aux conducteurs de recevoir des demandes de courses, et aux administrateurs de gérer l'ensemble du système.

## 🌐 Applications en Production

| Application | URL |
|---|---|
| 👥 Passagers | https://passenger.taxilibre.com |
| 🚗 Conducteurs | https://driver.taxilibre.com |
| 📊 Admin Dashboard | https://admin.taxilibre.com |

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
└── infrastructure/            # Configuration infrastructure (Terraform/AWS)
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
- PostgreSQL (AWS RDS)
- Redis (AWS ElastiCache)
- Socket.io 4.7.2 (Real-time)
- JWT Authentication
- Stripe 14.9.0 (Payments)
- Twilio 4.19.0 (SMS)
- Firebase Admin 10.3.0 (Push Notifications)

**DevOps:**
- Docker & Docker Compose (local/dev)
- AWS ECS Fargate (Production)
- AWS RDS PostgreSQL
- AWS ElastiCache Redis
- AWS Application Load Balancer (ALB)
- AWS Certificate Manager (SSL)
- GitHub Actions (CI/CD)
- Terraform (Infrastructure as Code)

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 18+
- npm 9+
- Docker & Docker Compose
- AWS Account (for production)
- Terraform (for infrastructure)

### Installation

```bash
# Cloner le repository
git clone https://github.com/shopdstok/taxilibre.git
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

### Lancement avec Docker (pour développement local)

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

## 🚢 Déploiement en Production (AWS ECS)

### Prérequis
- AWS CLI configuré
- Terraform installé
- Accès à un compte AWS avec les permissions nécessaires

### Étapes de déploiement

1. **Construire les images Docker**
   ```bash
   # Construire l'image du backend
   docker build -t taxilibre-backend ./backend
   
   # Construire les images du frontend (nginx pour servir les fichiers statiques)
   cd apps/passenger-web && docker build -t taxilibre-passenger-web .
   cd ../driver-web && docker build -t taxilibre-driver-web .
   cd ../admin-dashboard && docker build -t taxilibre-admin-dashboard .
   cd ../../
   ```

2. **Pousser les images vers Amazon ECR** (via les scripts GitHub Actions ou manuellement)
   - Les workflows GitHub Actions s'occupent de construire et pousser les images vers ECR lors du push sur la branche `main`.

3. **Déployer l'infrastructure avec Terraform**
   ```bash
   cd infrastructure
   terraform init
   terraform apply
   ```

4. **Mettre à jour les services ECS avec les nouvelles images**
   ```bash
   aws ecs update-service --cluster taxilibre-cluster --service taxilibre-backend-service --force-new-deployment
   # Répéter pour chaque service frontend
   ```

### GitHub Actions (CI/CD)
Le workflow `.github/workflows/deploy-production.yml` s'occupe de :
- Construire les images Docker
- Les pousser vers Amazon ECR
- Mettre à jour l'infrastructure Terraform (si nécessaire)
- Déployer les nouvelles versions sur les services ECS

### Variables d'environnement en production
Les variables d'environnement sont stockées dans AWS Systems Manager Parameter Store ou AWS Secrets Manager et injectées dans les tâches ECS.

## 📚 Documentation

- [API Documentation](./docs/API.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Infrastructure as Code (Terraform)](/infrastructure/README.md)

## 🔐 Sécurité

- JWT Authentication
- Password hashing (bcrypt)
- Rate limiting
- CORS configuration
- Helmet.js security headers
- Input validation (Joi)
- SQL injection prevention (Sequelize)
- HTTPS via ALB + ACM
- Secrets management via AWS Secrets Manager/SSM
- VPC isolé avec sous-réseaux privés et publics
- Groups de sécurité restreints

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

**Note:** Ce projet est en développement actif. De nouvelles fonctionnalités sont ajoutées régulièrement.## Deployment Strategy

This application is deployed using AWS ECS Fargate for container orchestration. The infrastructure is managed through Terraform files located in the `infrastructure/` directory.

### Infrastructure Components

- **AWS ECS Fargate**: Container orchestration service
- **AWS RDS PostgreSQL**: Primary database for application data
- **AWS ElastiCache Redis**: Caching layer for improved performance
- **AWS S3**: Storage for media assets and backups
- **AWS CloudWatch**: Monitoring and logging
- **AWS IAM**: Role-based access control
- **AWS ALB**: Load balancing for distributing traffic

### Deployment Process

1. Code changes are pushed to the main branch
2. GitHub Actions workflow (`.github/workflows/deploy-production.yml`) triggers
3. Terraform provisions/updates AWS infrastructure
4. Docker images are built and pushed to Amazon ECR
5. ECS tasks are updated with new container images
6. Health checks verify successful deployment

### Environment Variables

All configuration is managed through environment variables:
- Database connection strings
- API keys and secrets
- Feature flags
- Service endpoints

For local development, copy `.env.example` to `.env` and adjust values as needed.

## Development Setup

1. Install dependencies: `npm install`
2. Set up environment variables: `cp .env.example .env`
3. Start the infrastructure/parameter>