## Tâche 12 - Mettre à jour la configuration ECS Service Discovery ✅

**Fichiers modifiés :**
1. `infrastructure/services.tf` - Ajout de la configuration AWS Cloud Map pour la découverte de service

**Modifications détaillées :**

### 1. Espace de noms privé DNS (AWS Cloud Map)
- Création d'un espace de noms privé DNS : `taxilibre.internal` associé au VPC principal

### 2. Services de découverte pour chaque microservice
- **backend** : Service découverte pour l'API backend
- **passenger-web** : Service découverte pour l'application web passager
- **driver-web** : Service découverte pour l'application web chauffeur
- **admin-dashboard** : Service découverte pour le tableau de bord admin

Chaque service de découverte comprend :
- Configuration DNS avec enregistrement A (TTL 60 secondes)
- Politique de routage MULTIVALUE pour distribuer le trafic
- Configuration de vérification de santé personnalisée

### 3. Intégration avec les services ECS
Ajout du bloc `service_registries` à chaque service ECS :
- `aws_ecs_service.backend` : registre vers `aws_servicediscovery_service.backend`
- `aws_ecs_service.passenger_web` : registre vers `aws_servicediscovery_service.passenger_web`
- `aws_ecs_service.driver_web` : registre vers `aws_servicediscovery_service.driver_web`
- `aws_ecs_service.admin_dashboard` : registre vers `aws_servicediscovery_service.admin_dashboard`

### 4. Fonctionnement
Avec cette configuration :
- Chaque tâche ECS sera automatiquement enregistrée dans AWS Cloud Map
- Les services pourront se découvrir entre eux via DNS : `service-name.servicename.taxilibre.internal`
- Par exemple : le backend peut accéder à la base de données via `database.service.taxilibre.internal` (si configuré)
- Les appels inter-services utiliseront la découverte de service plutôt que des adresses IP statiques

**Note :** Pour que cette configuration fonctionne pleinement, les applications doivent être configurées pour utiliser la découverte de service (via des variables d'environnement ou de configuration pointant vers les noms de domaine de découverte de service). Cela peut nécessiter des modifications au niveau du code applicatif, qui seraient traitées dans des tâches de développement séparées.

**Prochaine étape :** Passer à la tâche 13 (Évaluer Express 5)