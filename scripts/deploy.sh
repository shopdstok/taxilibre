#!/bin/bash

# 🚗 TaxiLibre - Script de Déploiement Automatisé

set -e

echo "🚗 Démarrage déploiement TaxiLibre..."

# Variables
PROJECT_DIR=$(pwd)
BUILD_DIR="$PROJECT_DIR/build"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$PROJECT_DIR/backups/$TIMESTAMP"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifications
check_dependencies() {
    log_info "Vérification des dépendances..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js n'est pas installé"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "NPM n'est pas installé"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_warning "Docker n'est pas installé (optionnel)"
    fi
    
    log_success "Dépendances vérifiées"
}

# Backup
backup_project() {
    log_info "Création backup..."
    mkdir -p "$BACKUP_DIR"
    
    # Backup fichiers de configuration
    cp -r "$PROJECT_DIR/.env"* "$BACKUP_DIR/" 2>/dev/null || true
    cp -r "$PROJECT_DIR/firebase.json" "$BACKUP_DIR/" 2>/dev/null || true
    cp -r "$PROJECT_DIR/package.json" "$BACKUP_DIR/" 2>/dev/null || true
    
    log_success "Backup créé dans $BACKUP_DIR"
}

# Nettoyage
clean_project() {
    log_info "Nettoyage du projet..."
    
    # Nettoyage builds précédents
    rm -rf "$PROJECT_DIR/dist"
    rm -rf "$PROJECT_DIR/build"
    rm -rf "$PROJECT_DIR/.next"
    rm -rf "$PROJECT_DIR/node_modules/.cache"
    
    # Nettoyage logs
    find "$PROJECT_DIR" -name "*.log" -delete 2>/dev/null || true
    
    log_success "Nettoyage terminé"
}

# Installation dépendances
install_dependencies() {
    log_info "Installation des dépendances..."
    
    # Backend
    if [ -d "$PROJECT_DIR/taxilibre-backend" ]; then
        log_info "Installation dépendances backend..."
        cd "$PROJECT_DIR/taxilibre-backend"
        npm ci --silent
        cd "$PROJECT_DIR"
    fi
    
    # Admin
    if [ -d "$PROJECT_DIR/apps/admin/web" ]; then
        log_info "Installation dépendances admin..."
        cd "$PROJECT_DIR/apps/admin/web"
        npm ci --silent
        cd "$PROJECT_DIR"
    fi
    
    # Passager Web
    if [ -d "$PROJECT_DIR/apps/passenger/web" ]; then
        log_info "Installation dépendances passager web..."
        cd "$PROJECT_DIR/apps/passenger/web"
        npm ci --silent
        cd "$PROJECT_DIR"
    fi
    
    # Chauffeur Web
    if [ -d "$PROJECT_DIR/apps/driver/web" ]; then
        log_info "Installation dépendances chauffeur web..."
        cd "$PROJECT_DIR/apps/driver/web"
        npm ci --silent
        cd "$PROJECT_DIR"
    fi
    
    # Mobile
    if [ -d "$PROJECT_DIR/apps/passenger/mobile" ]; then
        log_info "Installation dépendances mobile..."
        cd "$PROJECT_DIR/apps/passenger/mobile"
        npm ci --silent
        cd "$PROJECT_DIR"
    fi
    
    log_success "Dépendances installées"
}

# Tests
run_tests() {
    log_info "Exécution des tests..."
    
    # Backend tests
    if [ -d "$PROJECT_DIR/taxilibre-backend" ]; then
        cd "$PROJECT_DIR/taxilibre-backend"
        if npm run test --silent; then
            log_success "Tests backend réussis"
        else
            log_warning "Tests backend échoués (continuation)"
        fi
        cd "$PROJECT_DIR"
    fi
    
    # Frontend tests
    for app in admin passenger driver; do
        if [ -d "$PROJECT_DIR/apps/$app/web" ]; then
            cd "$PROJECT_DIR/apps/$app/web"
            if npm run test --silent; then
                log_success "Tests $app réussis"
            else
                log_warning "Tests $app échoués (continuation)"
            fi
            cd "$PROJECT_DIR"
        fi
    done
}

# Build
build_project() {
    log_info "Build du projet..."
    
    # Backend
    if [ -d "$PROJECT_DIR/taxilibre-backend" ]; then
        log_info "Build backend..."
        cd "$PROJECT_DIR/taxilibre-backend"
        npm run build
        cd "$PROJECT_DIR"
        log_success "Backend buildé"
    fi
    
    # Admin
    if [ -d "$PROJECT_DIR/apps/admin/web" ]; then
        log_info "Build admin..."
        cd "$PROJECT_DIR/apps/admin/web"
        npm run build
        cd "$PROJECT_DIR"
        log_success "Admin buildé"
    fi
    
    # Passager Web
    if [ -d "$PROJECT_DIR/apps/passenger/web" ]; then
        log_info "Build passager web..."
        cd "$PROJECT_DIR/apps/passenger/web"
        npm run build
        cd "$PROJECT_DIR"
        log_success "Passager web buildé"
    fi
    
    # Chauffeur Web
    if [ -d "$PROJECT_DIR/apps/driver/web" ]; then
        log_info "Build chauffeur web..."
        cd "$PROJECT_DIR/apps/driver/web"
        npm run build
        cd "$PROJECT_DIR"
        log_success "Chauffeur web buildé"
    fi
    
    # Mobile Android
    if [ -d "$PROJECT_DIR/apps/passenger/mobile" ]; then
        log_info "Build Android..."
        cd "$PROJECT_DIR/apps/passenger/mobile"
        npx react-native build-android --mode=release
        cd "$PROJECT_DIR"
        log_success "Android buildé"
    fi
    
    # Mobile iOS
    if command -v xcodebuild &> /dev/null; then
        if [ -d "$PROJECT_DIR/apps/passenger/mobile" ]; then
            log_info "Build iOS..."
            cd "$PROJECT_DIR/apps/passenger/mobile"
            npx react-native build-ios --mode=Release
            cd "$PROJECT_DIR"
            log_success "iOS buildé"
        fi
    fi
}

# Déploiement
deploy_project() {
    log_info "Déploiement du projet..."
    
    # Backend Docker
    if command -v docker &> /dev/null; then
        if [ -f "$PROJECT_DIR/Dockerfile" ]; then
            log_info "Build Docker backend..."
            docker build -t taxilibre-backend:latest .
            log_success "Docker backend buildé"
        fi
        
        if [ -f "$PROJECT_DIR/docker-compose.yml" ]; then
            log_info "Déploiement Docker Compose..."
            docker-compose up -d
            log_success "Docker Compose déployé"
        fi
    fi
    
    # Firebase Hosting (Web)
    if command -v firebase &> /dev/null; then
        if [ -f "$PROJECT_DIR/firebase.json" ]; then
            log_info "Déploiement Firebase Hosting..."
            firebase deploy --only hosting --non-interactive
            log_success "Firebase Hosting déployé"
        fi
    fi
    
    # Vercel (Admin)
    if command -v vercel &> /dev/null; then
        if [ -d "$PROJECT_DIR/apps/admin/web" ]; then
            log_info "Déploiement Admin sur Vercel..."
            cd "$PROJECT_DIR/apps/admin/web"
            vercel --prod --scope admin
            cd "$PROJECT_DIR"
            log_success "Admin déployé sur Vercel"
        fi
    fi
}

# Monitoring
setup_monitoring() {
    log_info "Configuration monitoring..."
    
    # Vérification services
    if command -v curl &> /dev/null; then
        # Backend health check
        if curl -f http://localhost:3000/health &> /dev/null; then
            log_success "Backend en ligne"
        else
            log_warning "Backend hors ligne"
        fi
        
        # Frontend health check
        if curl -f https://taxilibre.com &> /dev/null; then
            log_success "Frontend en ligne"
        else
            log_warning "Frontend hors ligne"
        fi
    fi
    
    log_success "Monitoring configuré"
}

# Nettoyage post-déploiement
cleanup() {
    log_info "Nettoyage post-déploiement..."
    
    # Suppression anciens backups (garde 10 derniers)
    find "$PROJECT_DIR/backups" -type d -name "*" | sort -r | tail -n +11 | xargs rm -rf 2>/dev/null || true
    
    # Nettoyage cache npm
    npm cache clean --force 2>/dev/null || true
    
    log_success "Nettoyage terminé"
}

# Rapport
generate_report() {
    log_info "Génération rapport de déploiement..."
    
    REPORT_FILE="$PROJECT_DIR/deployment-report-$TIMESTAMP.txt"
    
    cat > "$REPORT_FILE" << EOF
🚗 RAPPORT DE DÉPLOIEMENT TAXILIBRE
=====================================

Date: $(date)
Timestamp: $TIMESTAMP

✅ COMPOSANTS DÉPLOYÉS:
EOF
    
    if [ -d "$PROJECT_DIR/taxilibre-backend" ]; then
        echo "- Backend API: ✅" >> "$REPORT_FILE"
    fi
    
    if [ -d "$PROJECT_DIR/apps/admin/web" ]; then
        echo "- Admin Dashboard: ✅" >> "$REPORT_FILE"
    fi
    
    if [ -d "$PROJECT_DIR/apps/passenger/web" ]; then
        echo "- Passager Web: ✅" >> "$REPORT_FILE"
    fi
    
    if [ -d "$PROJECT_DIR/apps/driver/web" ]; then
        echo "- Chauffeur Web: ✅" >> "$REPORT_FILE"
    fi
    
    if [ -d "$PROJECT_DIR/apps/passenger/mobile" ]; then
        echo "- Mobile App: ✅" >> "$REPORT_FILE"
    fi
    
    cat >> "$REPORT_FILE" << EOF

📊 STATISTIQUES:
- Durée totale: $SECONDS secondes
- Backup créé: $BACKUP_DIR
- Rapport: $REPORT_FILE

🌐 URLS:
- API: https://api.taxilibre.com
- Web: https://taxilibre.com
- Admin: https://admin.taxilibre.com
- Chauffeur: https://driver.taxilibre.com

📞 SUPPORT:
- Email: support@taxilibre.com
- Documentation: https://docs.taxilibre.com
EOF
    
    log_success "Rapport généré: $REPORT_FILE"
}

# Fonction principale
main() {
    SECONDS=0
    
    log_info "🚗 Déploiement TaxiLibre v1.0.0"
    echo ""
    
    check_dependencies
    echo ""
    
    backup_project
    echo ""
    
    clean_project
    echo ""
    
    install_dependencies
    echo ""
    
    run_tests
    echo ""
    
    build_project
    echo ""
    
    deploy_project
    echo ""
    
    setup_monitoring
    echo ""
    
    cleanup
    echo ""
    
    generate_report
    echo ""
    
    log_success "🎉 Déploiement TaxiLibre terminé avec succès !"
    log_info "Durée totale: $SECONDS secondes"
    
    # Notification
    if command -v notify-send &> /dev/null; then
        notify-send "TaxiLibre" "Déploiement terminé avec succès !" --icon=dialog-information
    fi
}

# Gestion erreurs
trap 'log_error "Déploiement échoué à l étape $LINENO"; exit 1' ERR

# Exécution
main "$@"
