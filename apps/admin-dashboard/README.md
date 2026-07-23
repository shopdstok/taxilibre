# TaxiLibre Admin Dashboard

## Console d'\''administration TaxiLibre

Application React pour la gestion de la plateforme VTC.

## Stack technique
- React 18 + Vite
- Tailwind CSS
- React Router v6
- TanStack Query v5
- Zustand (state management)
- Recharts (graphiques)
- Axios (client HTTP)

## Fonctionnalites
- Tableau de bord (stats, approbations chauffeurs)
- Gestion des utilisateurs (activation/desactivation/suppression)
- Gestion des chauffeurs (validation, suspension, filtres)
- Suivi des courses (filtres, pagination, statuts)
- Analyse des revenus (graphiques barres + camembert)
- Tickets de support (statuts, resolution)
- Parametres (tarification, options systeme)

## Demarrage local
```bash
npm install
npm run dev       # http://localhost:3001
```

## Build production
```bash
npm run build     # sortie dans dist/
npm run preview   # preview du build
```

## Deploiement
- Vercel: configure via `vercel.json`
- Docker: `docker build -t taxilibre-admin . && docker run -p 80:80 taxilibre-admin`