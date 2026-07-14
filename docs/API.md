# 📚 TaxiLibre - Documentation API

## 🌐 **Base URL**

```
Production : https://api.taxilibre.com
Développement : http://localhost:3000
```

## 🔐 **Authentification**

### **Endpoints**

#### `POST /auth/register`
Inscription nouvel utilisateur

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "phone": "+33612345678",
  "role": "passenger" // "passenger" | "driver" | "admin"
}
```

#### `POST /auth/login`
Connexion utilisateur

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Réponse**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "passenger"
    },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

#### `POST /auth/refresh`
Rafraîchir token

```json
{
  "refreshToken": "refresh_token"
}
```

#### `POST /auth/logout`
Déconnexion

**Headers**
```
Authorization: Bearer jwt_token
```

---

## 👤 **Utilisateurs**

### `GET /users/profile`
Profil utilisateur connecté

**Headers**
```
Authorization: Bearer jwt_token
```

**Réponse**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+33612345678",
    "role": "passenger",
    "status": "active",
    "createdAt": "2026-03-12T10:00:00Z"
  }
}
```

### `PUT /users/profile`
Mettre à jour profil

```json
{
  "name": "John Doe Updated",
  "phone": "+33612345678"
}
```

### `GET /users/drivers`
Liste chauffeurs (admin)

**Query Parameters**
- `page`: numéro page (défaut: 1)
- `limit`: résultats par page (défaut: 20)
- `status`: filtre statut
- `search`: recherche par nom/email

---

## 🚗 **Chauffeurs**

### `POST /drivers/register`
Inscription chauffeur

```json
{
  "user": {
    "email": "driver@example.com",
    "password": "password123",
    "name": "Jane Smith",
    "phone": "+33612345678"
  },
  "licenseNumber": "12345678901",
  "vehicle": {
    "make": "Toyota",
    "model": "Camry",
    "year": 2020,
    "color": "Noir",
    "licensePlate": "AB-123-CD",
    "type": "standard"
  }
}
```

### `POST /drivers/documents`
Upload documents chauffeur

**Content-Type**: `multipart/form-data`

```
license: file
insurance: file
registration: file
idCard: file
```

### `PUT /drivers/location`
Mettre à jour position chauffeur

```json
{
  "lat": 48.8566,
  "lng": 2.3522,
  "heading": 90,
  "speed": 50
}
```

### `GET /drivers/nearby`
Chauffeurs à proximité

**Query Parameters**
- `lat`: latitude
- `lng`: longitude
- `radius`: rayon en mètres (défaut: 5000)
- `vehicleType`: type véhicule

---

## 🚕 **Courses**

### `POST /rides/estimate`
Estimer prix course

```json
{
  "pickup": {
    "lat": 48.8566,
    "lng": 2.3522,
    "address": "Tour Eiffel, Paris"
  },
  "destination": {
    "lat": 48.8584,
    "lng": 2.2945,
    "address": "Arc de Triomphe, Paris"
  },
  "vehicleType": "standard"
}
```

**Réponse**
```json
{
  "success": true,
  "data": {
    "distance": 3200,
    "duration": 15,
    "price": 25.50,
    "priceBreakdown": {
      "base": 2.50,
      "distance": 3.84,
      "time": 4.50,
      "service": 0.50,
      "total": 25.50
    }
  }
}
```

### `POST /rides/request`
Demander course

```json
{
  "pickup": {
    "lat": 48.8566,
    "lng": 2.3522,
    "address": "Tour Eiffel, Paris"
  },
  "destination": {
    "lat": 48.8584,
    "lng": 2.2945,
    "address": "Arc de Triomphe, Paris"
  },
  "vehicleType": "standard",
  "paymentMethod": "card"
}
```

### `GET /rides/active`
Course active utilisateur

### `PUT /rides/:id/accept`
Accepter course (chauffeur)

### `PUT /rides/:id/cancel`
Annuler course

```json
{
  "reason": "Chauffeur indisponible"
}
```

### `PUT /rides/:id/start`
Démarrer course (chauffeur)

### `PUT /rides/:id/complete`
Terminer course (chauffeur)

```json
{
  "actualDistance": 3400,
  "actualDuration": 18,
  "actualPrice": 28.00
}
```

### `GET /rides/history`
Historique courses

**Query Parameters**
- `page`: numéro page
- `limit`: résultats par page
- `status`: filtre statut
- `startDate`: date début
- `endDate`: date fin

---

## 💳 **Paiements**

### `POST /payments/stripe/create-intent`
Créer intention paiement Stripe

```json
{
  "rideId": "ride_id",
  "amount": 2550, // en cents
  "currency": "EUR"
}
```

**Réponse**
```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_xxx_secret_xxx"
  }
}
```

### `POST /payments/paypal/create-order`
Créer ordre PayPal

```json
{
  "rideId": "ride_id",
  "amount": 25.50,
  "currency": "EUR"
}
```

### `GET /payments/history`
Historique paiements

### `POST /payments/webhook/stripe`
Webhook Stripe

---

## 🔔 **Notifications**

### `GET /notifications`
Liste notifications

### `PUT /notifications/:id/read`
Marquer notification comme lue

### `POST /notifications/register-token`
Enregistrer token FCM

```json
{
  "token": "fcm_token",
  "platform": "android" // "android" | "ios" | "web"
}
```

---

## 📍 **Localisation**

### `GET /locations/search`
Recherche adresses

**Query Parameters**
- `query`: texte recherche
- `lat`: latitude utilisateur
- `lng`: longitude utilisateur

### `GET /locations/reverse`
Adresse depuis coordonnées

**Query Parameters**
- `lat`: latitude
- `lng`: longitude

---

## 📄 **Documents**

### `GET /documents/types`
Types documents requis

### `POST /documents/upload`
Upload document

**Content-Type**: `multipart/form-data`

```
file: file
type: document_type
```

### `GET /documents/:id`
Télécharger document

---

## 🎫 **Support**

### `POST /support/tickets`
Créer ticket support

```json
{
  "subject": "Problème course",
  "description": "Ma course a été annulée...",
  "category": "ride_issue",
  "priority": "medium"
}
```

### `GET /support/tickets`
Liste tickets utilisateur

### `GET /support/tickets/:id`
Détails ticket

---

## 🔧 **Admin Endpoints**

### `GET /admin/users`
Gestion utilisateurs (admin)

### `PUT /admin/users/:id/status`
Changer statut utilisateur

```json
{
  "status": "suspended"
}
```

### `GET /admin/drivers/verification`
Chauffeurs en attente validation

### `PUT /admin/drivers/:id/verify`
Valider chauffeur

```json
{
  "status": "approved", // "approved" | "rejected"
  "rejectionReason": "Document invalide"
}
```

### `GET /admin/rides`
Toutes les courses (admin)

### `GET /admin/analytics`
Statistiques plateforme

**Réponse**
```json
{
  "success": true,
  "data": {
    "totalUsers": 10000,
    "totalDrivers": 500,
    "totalRides": 50000,
    "totalRevenue": 125000,
    "activeDrivers": 150,
    "averageRating": 4.7
  }
}
```

---

## 🚨 **Erreurs**

### **Format réponse erreur**

```json
{
  "success": false,
  "error": "error_code",
  "message": "Message d'erreur détaillé"
}
```

### **Codes erreur**

- `AUTH_001`: Email ou mot de passe incorrect
- `AUTH_002`: Token expiré
- `AUTH_003`: Accès non autorisé
- `USER_001`: Utilisateur non trouvé
- `USER_002`: Email déjà utilisé
- `DRIVER_001`: Chauffeur non validé
- `RIDE_001`: Course non trouvée
- `RIDE_002`: Course déjà acceptée
- `PAYMENT_001`: Paiement échoué
- `VALIDATION_001`: Données invalides
- `SERVER_001`: Erreur serveur interne

---

## 📊 **Pagination**

### **Format réponse paginée**

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 🔄 **WebSockets**

### **Connexion**

```javascript
const ws = new WebSocket('wss://api.taxilibre.com/ws');
```

### **Événements**

#### `ride_requested`
Nouvelle course pour chauffeurs

```json
{
  "type": "ride_requested",
  "data": {
    "ride": { ... },
    "timeout": 30000
  }
}
```

#### `ride_updated`
Mise à jour course

```json
{
  "type": "ride_updated",
  "data": {
    "rideId": "ride_id",
    "status": "in_progress",
    "location": { ... }
  }
}
```

#### `location_updated`
Position chauffeur

```json
{
  "type": "location_updated",
  "data": {
    "driverId": "driver_id",
    "location": { ... },
    "timestamp": "2026-03-12T10:00:00Z"
  }
}
```

---

## 🚀 **Rate Limiting**

- **Auth endpoints**: 5 requêtes/minute
- **API endpoints**: 100 requêtes/minute
- **Upload endpoints**: 10 requêtes/minute

---

## 🔒 **Sécurité**

### **Headers requis**

```
Authorization: Bearer jwt_token
Content-Type: application/json
X-API-Version: v1
```

### **CORS**

Origines autorisées :
- `https://taxilibre.com`
- `https://admin.taxilibre.com`
- `https://driver.taxilibre.com`
- `http://localhost:3000` (développement)

---

## 📱 **SDKs**

### **JavaScript/TypeScript**

```bash
npm install @taxilibre/sdk
```

```javascript
import { TaxiLibreAPI } from '@taxilibre/sdk';

const api = new TaxiLibreAPI({
  baseURL: 'https://api.taxilibre.com',
  apiKey: 'your_api_key'
});

// Demander course
const ride = await api.rides.request({
  pickup: { lat: 48.8566, lng: 2.3522 },
  destination: { lat: 48.8584, lng: 2.2945 },
  vehicleType: 'standard'
});
```

### **React Native**

```bash
npm install @taxilibre/react-native-sdk
```

---

## 🧪 **Tests**

### **Environnement de test**

```
https://api-staging.taxilibre.com
```

### **Sandbox Stripe**

```
https://api.stripe.com
```

### **Sandbox PayPal**

```
https://api-m.sandbox.paypal.com
```

---

## 📞 **Support Technique**

- **Email**: api-support@taxilibre.com
- **Documentation**: https://docs.taxilibre.com
- **Status**: https://status.taxilibre.com
- **Changelog**: https://changelog.taxilibre.com

---

**📚 L'API TaxiLibre est conçue pour être simple, rapide et sécurisée.**

**Pour toute question technique, contactez notre équipe de support.** 🚗✨
