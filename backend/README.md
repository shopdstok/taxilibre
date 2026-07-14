# TaxiLibre Backend API

Express.js REST API for the TaxiLibre ride-hailing platform.

## 📋 Project Structure

```
src/
├── controllers/         # Request handlers
├── routes/              # API route definitions
├── models/              # Database models (Sequelize)
├── services/            # Business logic layer
├── middleware/          # Custom middleware
├── config/              # Configuration files
├── utils/               # Helper utilities
├── scripts/             # Database scripts
└── uploads/             # File uploads
```

## 🚀 Getting Started

```bash
cd backend
npm install
npm run dev
```

## 📦 Services

### Matching Service (`matchingService.js`)
- Find nearest drivers
- Calculate distance
- Sort by rating and proximity

### Pricing Service (`pricingService.js`)
- Calculate ride fares
- Apply surge pricing
- Calculate platform fees
- Apply promotional codes

### Socket Service (`socketService.js`)
- Handle real-time connections
- Broadcast ride requests
- Track driver locations
- Update ride status

### Notification Service (`notificationService.js`)
- Send emails
- Send SMS (Twilio)
- Push notifications
- In-app notifications

## 🗄️ Database Models

- **User** - Platform users
- **Driver** - Driver profiles
- **Vehicle** - Vehicles
- **Ride** - Ride records
- **Payment** - Payment transactions
- **Review** - Ride reviews

## 🔐 Authentication

JWT-based authentication with role-based access control:
- Admin
- Driver
- Passenger

## 🧪 Testing

```bash
npm run test
npm run test:watch
npm run test:cov
```

## 📝 Logging

Logs are available in:
- Development: Console output
- Production: Log files in `logs/` directory

## 🐞 Error Handling

Centralized error handling with standard response format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 📚 API Documentation

Swagger documentation available at `/api/docs`

---

**TaxiLibre Backend** - RESTful API for ride-hailing platform
