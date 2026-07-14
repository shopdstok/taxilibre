#!/bin/bash

# Script de build pour TaxiLibre Driver
echo "🚀 Démarrage du build TaxiLibre Driver..."

# Nettoyer les builds précédents
echo "🧹 Nettoyage du dossier dist..."
rm -rf dist

# Vérifier les dépendances
echo "📦 Vérification des dépendances..."
if [ ! -d "node_modules" ]; then
    echo "📥 Installation des dépendances..."
    npm install
fi

# Vérifier les variables d'environnement
echo "🔧 Configuration des variables d'environnement..."
export NODE_ENV=production
export VITE_API_URL=${VITE_API_URL:-"https://api.taxilibre.com"}

# Lancer le build
echo "🏗️  Build de l'application..."
npm run build

# Vérifier si le build a réussi
if [ $? -eq 0 ]; then
    echo "✅ Build réussi !"
    echo "📊 Statistiques du build:"
    
    # Afficher la taille du build
    if [ -d "dist" ]; then
        echo "📁 Taille du dossier dist:"
        du -sh dist
        
        echo "📄 Fichiers générés:"
        find dist -type f -exec ls -lh {} \; | head -10
        
        # Vérifier le fichier index.html
        if [ -f "dist/index.html" ]; then
            echo "✅ index.html généré avec succès"
        else
            echo "❌ index.html manquant"
            exit 1
        fi
        
        # Vérifier les assets
        if [ -d "dist/assets" ]; then
            echo "✅ Assets générés"
            echo "📦 Nombre de fichiers assets:"
            find dist/assets -type f | wc -l
        else
            echo "❌ Assets manquants"
            exit 1
        fi
    else
        echo "❌ Dossier dist non généré"
        exit 1
    fi
    
    echo "🎉 Build TaxiLibre Driver terminé avec succès !"
    echo "🌐 Prêt pour le déploiement Vercel"
    
else
    echo "❌ Build échoué"
    echo "🔍 Vérification des erreurs:"
    
    # Afficher les erreurs npm
    if [ -f "npm-debug.log" ]; then
        echo "📋 Logs npm:"
        tail -20 npm-debug.log
    fi
    
    exit 1
fi
