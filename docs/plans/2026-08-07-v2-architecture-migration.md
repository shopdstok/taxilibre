# TaxiLibre V2.0 — Plan de Migration vers l'Architecture Cible

> Roadmap d analyse et migration. Les plans d implementation detailles (TDD bite-size) par sous-systeme seront generes apres validation des decisions architecturales (§5).

**Objectif :** Transformer TaxiLibre (Express + Sequelize) en plateforme ride-hailing production-grade multi-acteurs, matching temps reel, tarification dynamique, scalable a 10 000+ utilisateurs simultanes.

**Architecture cible (specification) :** API Gateway Nginx -> microservices (Auth, Ride/Matching, Notification) -> BullMQ (Redis) -> PostgreSQL+PostGIS (Prisma) / Redis Cluster / S3. Real-time Socket.io + Redis adapter. Frontends React Native (Expo) + Next.js 14 + Admin Tremor + Landing Astro.

**Stack cible :** NestJS, PostgreSQL 15 + PostGIS, Prisma, Redis Cluster, Socket.io + Redis adapter, BullMQ, JWT RS256, Stripe Connect, Google Maps + Mapbox, FCM + Twilio, Prometheus + Grafana + Sentry, Jest + Supertest + Playwright.

## Global Constraints (specification, valeurs verbatim)

- 10 000+ utilisateurs actifs simultanes, 99.9% uptime, latence matching < 100ms
- API Gateway Nginx/Kong : routing, SSL, rate limiting
- API latency p95 < 50ms ; matching < 500ms ; 1000 req/s par instance
- JWT RS256 asymetrique ; Access 15min ; Refresh 7j avec rotation ; 2FA TOTP obligatoire chauffeurs
- Rate limiting 5 tentatives login/min/IP ; detection comportement anormal
- PostgreSQL 15 + PostGIS ; ORM Prisma ; read replicas + PgBouncer
- Redis Cluster : cache, sessions, Geo, pub/sub, BullMQ
- Stripe Connect + Wallet interne ; commission 15-25% ; payout J+1/J+7
- Coverage tests > 80% ; load test 1000 users simultanes (k6/Artillery)
- iOS 14+ / Android 8+ ; responsive mobile-first ; WCAG 2.1 AA
- RGPD : consentement, portabilite, droit a l oubli (anonymisation)
- Environnements : local (docker-compose) / dev / staging / prod (blue-green)

---

## 1. Etat actuel (As-Is)

### 1.1 Structure monorepo

    taxilibre/
    |- apps/ {passenger-web, driver-web, admin-dashboard, mobile(Expo x1), ...}
    |- backend/ (Express + Sequelize, CommonJS)
    |   |- src/{config,controllers,middleware,models,routes,services,socket,utils,validators,workers,shared}
    |   \- database/migrations (SQL 001-012)
    |- shared/ {constants,i18n,types,utils,components}
    |- database/migrations (Supabase RLS 001-005)
    |- services/ functions/ supabase/ (experimentations Supabase/Firebase)
    |- docker/ nginx/ gateway-nginx/ infrastructure/ docker-compose
    \- prisma.config.ts (orphelin : reference prisma/schema.prisma INEXISTANT)

### 1.2 Ce qui est solide (reutiliser)

- 14 modeles Sequelize couvrant ~90% du schema cible (User, Driver, Vehicle, Ride, Payment, Rating, Promotion, Review, UserMFA, GeoZone, PushSubscription, AuditLog, RefreshToken, DeviceToken)
- Services metier existants : pricing, matching, geofencing, geolocation, jwt, mfa, oauth2, otp, stripe, wallet, push, sms, email, analytics, audit, eventBus
- Securite de base : helmet, rate limiters (general/auth/sensible), CSRF middleware, AsyncLocalStorage -> RLS Postgres (set_config app.user_id/role)
- Observabilite : /metrics (prom-client), Swagger UI, /health
- Tests : Jest + Supertest + Playwright configures ; SQLite in-memory en test
- Mobile Expo SDK 52 (RN 0.76) : maps, location, notifications, stripe, secure-store, socket.io, zustand
- Redis config (config/redis.js) robuste : kv wrapper normalisant casse (geoRadius/georadius) + degradation gracieuse + reconnect backoff

### 1.3 Problemes critiques et divergences (detail §3)

- RED **Redis non reellement'utilise** : matchingService et jwtService appellent des methodes cassantes (georadius/setex/get) sur le client brut node-redis v4 (camelCase) ou l objet module, plutot que sur le wrapper kv qui les normalise. Si config/redis se charge, jwtService.isTokenBlacklisted peut lever TypeError -> 401 sur tout endpoint protege ; matching leve sur redisClient.georadius. A reproduire en test d integration puis corriger en utilisant kv.
- RED **JWT HS256 + secret hardcode par defaut + secret LOGGE** (logger.info('...secret:', secret.substring(0,10)+"...")). Non conforme RS256, fuite en logs.
- RED **Pas d adapter Redis Socket.io** -> perte des connexions WebSocket en scaling horizontal.
- WARN **Matching distance-only** : pas de score composite (distance 40 / rating 30 / completion 20 / eta 10) de la spec.
- WARN **3 libs de validation** (joi + zod + express-validator) -> standardiser sur Zod.
- WARN **2 systemes de migrations SQL** (database/migrations Supabase + backend/database/migrations) + prisma.config.ts orphelin -> single source of truth a definir.
- WARN **Module system mixte** (backend CommonJS / racine ESM) ; scripts commit_*.sh a nettoyer ; fichiers .backup dans models.
- WARN **Pas de BullMQ** ; pas de tests de charge ; coverage inconnue ; pas de dashboards Grafana/Sentry wired.
- WARN **Secrets en .env** (Stripe/Twilio/Firebase/SMTP/Google) ; pas de secrets manager.

---

## 2. Gap Analysis vs architecture cible

| Domaine | Actuel | Cible | Statut |
|---|---|---|---|
| Framework API | Express (CommonJS) | NestJS (modulaire, DI, decorators) | X Divergence majeure |
| ORM | Sequelize | Prisma + PostGIS | X Migration |
| Schema | Sequelize models | schema.prisma | X A generer |
| Migrations | SQL duplique + prisma.config orphelin | Prisma migrations | X Unifier |
| Redis usage | configure mais appele facon cassante | kv + socket adapter + BullMQ + rate-limit store | RED Reparer |
| Socket scaling | sans adapter | @socket.io/redis-adapter | RED Manquant |
| Queues jobs | aucune | BullMQ | X Manquant |
| JWT | HS256 secret hardcode+logge | RS256 keypair | RED Durcir |
| Matching | distance tri | Score composite + radius expansion config | WARN Ameliorer |
| Validation | 3 libs | Zod | WARN Standardiser |
| KYC chauffeur | modele documents | OCR + reverification (Onfido) + quiz | WARN Partiel |
| Surge pricing | pricingService existant | multiplicateurs data-driven (demand/weather/event/time) | WARN Cabler |
| Notifications | services FCM+SMS presents | wiring complet + retry via queue | WARN Cabler |
| Monitoring | /metrics + Swagger | + Grafana dashboards, Sentry, alerting | WARN Etendre |
| Tests | Jest/Supertest/Playwright | >80% coverage + load k6/Artillery | WARN Etendre |
| Module system | CJS+ESM mixte | unifie | WARN Unifier |
| Mobile | 1 app Expo partagee | passager+chauffeur (voir §5 decision) | WARN Definir |
| Secrets | .env clair | Vault/Secrets Manager | WARN Externaliser |
| API Docs | Swagger | OpenAPI 3.0 auto-genere | OK Present |
| Auth/2FA/OAuth | services presents | RS256 + hardening | WARN Durcir |

---

## 3. Decision architecturale cle (a valider)

La spec impose **NestJS + Prisma**. Le projet actuel est **Express + Sequelize** avec une couche metier deja riche et fonctionnelle. Deux trajectoires :

### Option A - Refonte NestJS + Prisma (stricte conformite spec)

- Conforme 100% a la cible ; DI/testabilite ; structure modulaire.
- Risque de regression sur features qui marchent (auth, matching, stripe, wallet).
- Effort massif (estim. multi-mois) ; haut risque de tout casser en chemin.

### Option B - Evolution pragmatique (RECOMMANDEE)

Garder Express comme hote, **migrer Sequelize -> Prisma** (type-safe + PostGIS), **activer un Redis unifie** (reparer kv usage + socket adapter + BullMQ + rate-limit store), **durcir JWT en RS256**, standardiser **Zod**, puis **introduire NestJS progressivement** (strangler pattern) uniquement sur les nouveaux modules - une fois la base Express stabilisee.
- Preserve les features fonctionnelles ; valeur immediate ; risque maitrise.
- Capture ~80% de la valeur architecturale de la spec a cout bien moindre.
- Divergence temporaire d avec NestJS pur (rattrapable via strangler).

### Recommandation

**Phase 0 (stabilisation a risque) + Phase 1 (Prisma + Redis unifie + JWT RS256) en Option B**, puis reevaluer NestJS. La conformite NestJS ne doit PAS preceder la stabilisation (Redis cassant + JWT secret logge + matching cassant = bloquants production, independants du framework).

---

## 4. Roadmap par phases

> Principe writing-plans : ce sont des sous-systemes independants. Chacun aura son **plan TDD bite-size** distinct genere ensuite (un plan par sous-systeme, produit livrable testable). Les phases ci-dessous fixent l ordre et les dependances.

### Phase 0 - Stabilisation critiques (moins de 2 sem.) [BLOQUANT]

0.1 Reparer le Redis-coupling : matchingService + jwtService utilisent le wrapper kv ; ajout tests d integration redis-on/redis-off.
0.2 JWT : retirer tout logging de secret ; fail-fast si JWT_SECRET non defini en prod ; stopper le secret hardcode.
0.3 Socket.io : brancher @socket.io/redis-adapter (deja installe).
0.4 Nettoyage : git status, build racine OK, retirer fichiers .backup, scripts commit_*.sh inutiles.
0.5 Smoke test de demarrage backend (DB + Redis + socket) en local docker-compose.

### Phase 1 - Fondations donnees et securite (sem. 1-2)

1.1 Generer prisma/schema.prisma depuis les modeles Sequelize existants ; valider correspondance, dupliquer les migrations SQL en baseline Prisma.
1.2 Migrer la couche data Sequelize -> Prisma (repositories), modele par modele (User -> Driver -> Vehicle -> Ride -> Payment -> Rating ...). Garder Sequelize derriere une facade le temps de la bascule.
1.3 JWT RS256 : paires de cles, rotation, refresh rotation, blacklist via Redis (kv). 2FA TOTP chauffeurs (mfaService deja present).
1.4 Standardiser validation sur Zod (supprimer joi/express-validator sur endpoints critiques). Input validation sur tous les endpoints.
1.5 Rate limiting distribue via Redis store (rate-limit-redis deja installe).
1.6 Unifier module system (ESM) ; CI lint + tests verts.

### Phase 2 - Core Ride temps reel (sem. 3-4)

2.1 Redis Geo unifie : GEOADD drivers:online:<VEHICLE_TYPE> par type de vehicule + TTL position (10s).
2.2 Matching : implementer score composite (distance 40 / rating 30 / completion 20 / eta 10) + expansion de rayon (2->5->10km) pilotee par config + timeout.
2.3 BullMQ : queue matching async + notifications differrees + payouts webhook.
2.4 Socket.io : evenements ride lifecycle (requested/accepted/arrived/started/completed/cancelled) + rooms geographiques.
2.5 Estimation prix + flux booking complet (estimation->confirm->broadcast->accept->tracking->payment->rating).
2.6 Snap-to-road + ETA temps reel (Google Roads) ; partage de trajet (lien temporaire 30min).

### Phase 3 - Paiement et notifications (sem. 5)

3.1 Stripe Connect : onboarding chauffeur, paiements fractionnes, payouts auto (J+1/J+7), retenue garantie 5%.
3.2 Methodes paiement (card/Apple/Google/PayPal/cash/wallet) + pre-autorisation.
3.3 Wallet interne + gestion remboursements/webhooks robuste.
3.4 Notifications FCM + Twilio via queue (retry, preferences, events du §6 spec).

### Phase 4 - Mobile (sem. 6-8)

4.1 Passager : carte (Mapbox/GM), Places autocomplete, bottom-sheet types+estimations, radar matching, suivi temps reel, SOS, partage, paiement+tip+rating.
4.2 Chauffeur : toggle online/offline, heatmap demandes, popup course (15s), navigation Waze/GM, flux Arrive/Demarrer/Terminer, gains+retrait.
4.3 KYC chauffeur strict (selfie+doc OCR, permis OCR, carte grise/assurance, validation admin 24-48h, RIB Stripe, quiz 10Q).
4.4 Real-time tracking, push, biometrie.

### Phase 5 - Web et Admin (sem. 9-10)

5.1 Passager web (Next.js 14 App Router) ; Chauffeur web.
5.2 Admin (Next.js + Tremor) : dashboard KPIs, chauffeurs (verif/suspendre), courses, passagers, finances, tarification (zones/surge), promotions, support.
5.3 Landing Astro + Tailwind.

### Phase 6 - Polish et Scale (sem. 11-12)

6.1 Perf : read replicas, PgBouncer, DataLoader anti-N+1, cache Redis, CDN, code splitting.
6.2 Securite : audit, secrets manager, WAF/DDoS, container scanning.
6.3 Load testing k6/Artillery (1000 users) ; dashboards Grafana ; Sentry.
6.4 CI/CD GitHub Actions (lint->test->build->scan->staging->e2e->prod blue-green) ; Terraform ; Helm/K8s ; monitoring (Datadog/ELK, PagerDuty).
6.5 Documentation : README, OpenAPI, ADRs, runbooks, RGPD.

---

## 5. Decisions ouvertes (a trancher)

5.1 **Framework** : Option B evolution (recommandee) vs Option A refonte NestJS. [impact maximal]
5.2 **Mobile** : 1 app multi-role (toggle passager/chauffeur) vs 2 apps separees. Recommande : 1 app multi-role + onboarding KYC separe pour chauffeur (reduit maintenance).
5.3 **Provider maps** : Google Maps primaire + Mapbox fallback (spec) - confirmer quotas/costs.
5.4 **KYC/OCR provider** : Onfido vs AWS Rekognition (spec hesite).
5.5 **DB hosting** : Supabase (Postgres RLS deja partiellement en place) vs RDS manage - confirmer pour aligner migrations et RLS.
5.6 **Localisation plan** : ce plan est multi-sous-systemes ; generer ensuite 1 plan bite-size TDD par sous-systeme (commencer par Phase 0.1 Redis-coupling ou Phase 1.1 Prisma selon decision 5.1).

---

## 6. Risques

- R0 Regression features Express lors migration Prisma -> mitige par facade + migration modele-par-modele + tests.
- R1 Bascule NestJS prematuree sur code instable -> mitige par Phase 0 d abord (strangler ensuite).
- R2 Drift migrations SQL vs Prisma baseline -> mitige par single source Prisma + import baseline.
- R3 Secret leak (JWT logge) deja potentiellement en prod -> corriger en Phase 0 + rotation immediate.
- R4 Redis GEO cassant avec vrai client node-redis -> mitige par kv + tests redis on/off.
- R5 Scope 12 sem. realiste uniquement si equipe dediee + CI disciplinee.

---

## 7. Prochaines etapes immediates

1. Trancher §5.1 (framework) et §5.5 (DB hosting).
2. Generer le plan TDD bite-size du premier sous-systeme :
   - si priorite production-safe : **Phase 0.1 - Reparer Redis-coupling** (matchingService + jwtService -> kv, + tests d integration redis on/off).
   - si priorite data migration : **Phase 1.1 - schema.prisma depuis Sequelize** (baseline migration + facade repository).
3. Valider en local via docker-compose up (Postgres + Redis) puis npm run dev:backend.

---

## Annexe - Inventaire backend (reference rapide)

- config/ : database.js (Sequelize+pg, RLS via asyncStorage), redis.js (kv wrapper + degradation), swagger.js
- models/ (14) : User, Driver, Vehicle, Ride, Payment, Rating, Promotion, Review, UserMFA, GeoZone, PushSubscription, AuditLog, RefreshToken, DeviceToken, NotificationPreferences (+ fichiers .backup a nettoyer)
- services/ : matching, pricing, priceEstimation, geofencing, geolocation, location, jwt, mfa, oauth2, otp, stripe, wallet(ctrl), push, sms, email, analytics, auditLog, eventBus, currency, refreshToken, logging, optimization, notification
- controllers/ : auth(15k), ride(26k), wallet(14k), payment, driver, user, review, notification, location, geofencing, mfa, analytics, push, enhancedRide
- routes/ : auth, rides, driver, user, payment, admin(15k), oauth, location, notification, mfa, push, review, geofencing, analytics, monitoring
- middleware/ : auth, admin, csrf, rateLimiter, validation, healthCheck, error
- socket/ : index.js (socket.io) - voir adapter Redis manquant
