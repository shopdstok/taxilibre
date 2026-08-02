# Update CHANGELOG or create a summary of changes for task 11

## Tâche 11 - Configurer HTTPS sur ALB Terraform ✅

**Fichiers modifiés :**
1. `infrastructure/variables.tf` - Ajout des variables `domain_name` et `hosted_zone_id`
2. `infrastructure/main.tf` - Ajout du certificat ACM, validation DNS via Route53, et mise à jour des ressources
3. `infrastructure/services.tf` - Configuration du listener HTTP vers HTTPS redirection et du listener HTTPS avec certificat
4. `infrastructure/outputs.tf` - Ajout des outputs pour le DNS du ALB, domaine, région et ARN du certificat
5. `gateway-nginx/nginx.conf` - Mise à jour de la configuration Nginx pour supporter le HTTPS (pour l'environnement local/Docker)

**Modifications détaillées :**
- Variables ajoutées : `domain_name` (défaut: "taxilibre.com") et `hosted_zone_id` (défaut: "")
- Ressource ACM Certificate créée avec validation DNS
- Enregistrement Route53 créé pour la validation du certificat
- Ressource de validation du certificat ACM ajoutée
- Listeners ALB configurés :
  - Listener HTTP (port 80) redirige vers HTTPS (code 301)
  - Listener HTTPS (port 443) utilise le certificat ACM et_policy de sécurité TLS
- Les règles de routage sont désormais attachées au listener HTTPS
- Outputs ajoutés pour faciliter l'utilisation des ressources créées

**Prochaine étape :** Passer à la tâche 12 (Mettre à jour la configuration ECS Service Discovery)