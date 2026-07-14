# Taxilibre Project Context

Objectif:
Créer une plateforme VTC mondiale.

Premier lancement:
Paris.

Stack actuelle:
- React TypeScript Vite
- Node Express
- PostgreSQL
- Sequelize
- Redis
- Socket.io
- Docker
- Stripe

Priorité actuelle:
Faire fonctionner une course complète.

Flux obligatoire:

Passenger
→ Create Ride
→ Matching Driver
→ Driver Accept
→ Driver Arrive
→ Start Ride
→ Complete Ride
→ Payment
→ History

Problèmes principaux:
- frontend/backend API incohérents
- ride lifecycle incohérent
- driver-web cassé
- database schemas multiples
- socket events différents

Règle:
Ne pas reconstruire tout.
Stabiliser l'existant.