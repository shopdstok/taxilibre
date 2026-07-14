#!/bin/bash

# 🚗 TaxiLibre - Script d'Installation Automatisé

set -e

echo "🚗 Installation TaxiLibre..."

# Variables
PROJECT_DIR=$(pwd)
NODE_VERSION="18"
FIREBASE_PROJECT_ID="taxilibre-app"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Vérifications système
check_system() {
    log_info "Vérification système..."
    
    # OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="Linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macOS"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        OS="Windows"
    else
        log_error "OS non supporté: $OSTYPE"
        exit 1
    fi
    
    log_success "OS détecté: $OS"
    
    # Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION_CURRENT=$(node --version | cut -d'v' -f2)
        log_success "Node.js: $NODE_VERSION_CURRENT"
    else
        log_warning "Node.js non installé"
    fi
    
    # npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        log_success "NPM: $NPM_VERSION"
    else
        log_error "NPM non installé"
        exit 1
    fi
    
    # Git
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version)
        log_success "Git: $GIT_VERSION"
    else
        log_warning "Git non installé"
    fi
}

# Installation Node.js
install_nodejs() {
    if ! command -v node &> /dev/null; then
        log_info "Installation Node.js $NODE_VERSION..."
        
        if [[ "$OS" == "Linux" ]]; then
            # Ubuntu/Debian
            if command -v apt &> /dev/null; then
                curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
                sudo apt-get install -y nodejs
            # CentOS/RHEL
            elif command -v yum &> /dev/null; then
                curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | sudo bash -
                sudo yum install -y nodejs
            fi
        elif [[ "$OS" == "macOS" ]]; then
            if command -v brew &> /dev/null; then
                brew install node@$NODE_VERSION
                brew link node@$NODE_VERSION
            else
                log_error "Homebrew non installé. Veuillez installer Node.js manuellement."
                exit 1
            fi
        elif [[ "$OS" == "Windows" ]]; then
            log_info "Veuillez télécharger Node.js depuis https://nodejs.org"
            exit 1
        fi
        
        log_success "Node.js installé"
    fi
}

# Installation Firebase CLI
install_firebase() {
    if ! command -v firebase &> /dev/null; then
        log_info "Installation Firebase CLI..."
        npm install -g firebase-tools
        log_success "Firebase CLI installé"
    else
        log_success "Firebase CLI déjà installé"
    fi
}

# Installation Vercel CLI
install_vercel() {
    if ! command -v vercel &> /dev/null; then
        log_info "Installation Vercel CLI..."
        npm install -g vercel
        log_success "Vercel CLI installé"
    else
        log_success "Vercel CLI déjà installé"
    fi
}

# Installation React Native CLI
install_react_native() {
    if ! command -v react-native &> /dev/null; then
        log_info "Installation React Native CLI..."
        npm install -g @react-native-community/cli
        log_success "React Native CLI installé"
    else
        log_success "React Native CLI déjà installé"
    fi
}

# Configuration Git
setup_git() {
    log_info "Configuration Git..."
    
    if [ -z "$(git config --global user.name)" ]; then
        read -p "Entrez votre nom Git: " GIT_NAME
        git config --global user.name "$GIT_NAME"
    fi
    
    if [ -z "$(git config --global user.email)" ]; then
        read -p "Entrez votre email Git: " GIT_EMAIL
        git config --global user.email "$GIT_EMAIL"
    fi
    
    log_success "Git configuré"
}

# Configuration Firebase
setup_firebase() {
    log_info "Configuration Firebase..."
    
    if command -v firebase &> /dev/null; then
        # Login Firebase
        firebase login --no-localhost
        
        # Initialisation projet
        if [ ! -f "$PROJECT_DIR/firebase.json" ]; then
            log_info "Initialisation projet Firebase..."
            firebase init hosting --project=$FIREBASE_PROJECT_ID --default
        fi
        
        log_success "Firebase configuré"
    else
        log_warning "Firebase CLI non installé"
    fi
}

# Configuration environnement
setup_environment() {
    log_info "Configuration environnement..."
    
    # Variables .env
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        if [ -f "$PROJECT_DIR/.env.example" ]; then
            cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
            log_info "Fichier .env créé à partir de .env.example"
            log_warning "Veuillez éditer .env avec vos clés API"
        else
            log_warning "Fichier .env.example non trouvé"
        fi
    else
        log_success "Fichier .env déjà existant"
    fi
    
    # Dossiers
    mkdir -p "$PROJECT_DIR/logs"
    mkdir -p "$PROJECT_DIR/backups"
    mkdir -p "$PROJECT_DIR/uploads"
    
    log_success "Environnement configuré"
}

# Installation dépendances
install_dependencies() {
    log_info "Installation dépendances..."
    
    # Dépendances principales
    npm install
    
    # Backend
    if [ -d "$PROJECT_DIR/taxilibre-backend" ]; then
        log_info "Installation dépendances backend..."
        cd "$PROJECT_DIR/taxilibre-backend"
        npm install
        cd "$PROJECT_DIR"
    fi
    
    # Applications
    for app in admin passenger driver; do
        if [ -d "$PROJECT_DIR/apps/$app/web" ]; then
            log_info "Installation dépendances $app web..."
            cd "$PROJECT_DIR/apps/$app/web"
            npm install
            cd "$PROJECT_DIR"
        fi
        
        if [ -d "$PROJECT_DIR/apps/$app/mobile" ]; then
            log_info "Installation dépendances $app mobile..."
            cd "$PROJECT_DIR/apps/$app/mobile"
            npm install
            cd "$PROJECT_DIR"
        fi
    done
    
    # Shared
    if [ -d "$PROJECT_DIR/shared" ]; then
        log_info "Installation dépendances shared..."
        cd "$PROJECT_DIR/shared"
        npm init -y
        npm install typescript @types/node --save-dev
        cd "$PROJECT_DIR"
    fi
    
    log_success "Dépendances installées"
}

# Configuration Docker (optionnel)
setup_docker() {
    if command -v docker &> /dev/null; then
        log_info "Configuration Docker..."
        
        if [ -f "$PROJECT_DIR/Dockerfile" ]; then
            # Build image
            docker build -t taxilibre-backend:latest .
            log_success "Docker image buildée"
        fi
        
        if [ -f "$PROJECT_DIR/docker-compose.yml" ]; then
            # Démarrer services
            docker-compose up -d
            log_success "Docker Compose démarré"
        fi
    else
        log_info "Docker non installé (optionnel)"
    fi
}

# Configuration React Native
setup_react_native() {
    log_info "Configuration React Native..."
    
    if [ -d "$PROJECT_DIR/apps/passenger/mobile" ]; then
        cd "$PROJECT_DIR/apps/passenger/mobile"
        
        # Android
        if [[ "$OS" == "Linux" ]] || [[ "$OS" == "macOS" ]]; then
            log_info "Configuration Android..."
            npx react-native setup-android-template
        fi
        
        # iOS (macOS seulement)
        if [[ "$OS" == "macOS" ]]; then
            log_info "Configuration iOS..."
            npx react-native setup-ios-template
            if command -v pod &> /dev/null; then
                cd ios && pod install && cd ..
            fi
        fi
        
        cd "$PROJECT_DIR"
        log_success "React Native configuré"
    fi
}

# Tests post-installation
run_tests() {
    log_info "Tests post-installation..."
    
    # Test Node.js
    if command -v node &> /dev/null; then
        NODE_TEST_VERSION=$(node --version)
        log_success "Node.js: $NODE_TEST_VERSION"
    fi
    
    # Test npm
    if command -v npm &> /dev/null; then
        NPM_TEST_VERSION=$(npm --version)
        log_success "NPM: $NPM_TEST_VERSION"
    fi
    
    # Test Firebase
    if command -v firebase &> /dev/null; then
        FIREBASE_TEST_VERSION=$(firebase --version)
        log_success "Firebase CLI: $FIREBASE_TEST_VERSION"
    fi
    
    # Test Vercel
    if command -v vercel &> /dev/null; then
        VERCEL_TEST_VERSION=$(vercel --version)
        log_success "Vercel CLI: $VERCEL_TEST_VERSION"
    fi
    
    # Test React Native
    if command -v react-native &> /dev/null; then
        RN_TEST_VERSION=$(react-native --version)
        log_success "React Native CLI: $RN_TEST_VERSION"
    fi
}

# Rapport d'installation
generate_report() {
    log_info "Génération rapport d'installation..."
    
    REPORT_FILE="$PROJECT_DIR/installation-report-$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$REPORT_FILE" << EOF
🚗 RAPPORT D'INSTALLATION TAXILIBRE
=====================================

Date: $(date)
OS: $OS
Node.js: $(node --version 2>/dev/null || echo "Non installé")
NPM: $(npm --version 2>/dev/null || echo "Non installé")
Git: $(git --version 2>/dev/null || echo "Non installé")

✅ COMPOSANTS INSTALLÉS:
EOF
    
    if command -v firebase &> /dev/null; then
        echo "- Firebase CLI: ✅" >> "$REPORT_FILE"
    fi
    
    if command -v vercel &> /dev/null; then
        echo "- Vercel CLI: ✅" >> "$REPORT_FILE"
    fi
    
    if command -v react-native &> /dev/null; then
        echo "- React Native CLI: ✅" >> "$REPORT_FILE"
    fi
    
    if [ -d "$PROJECT_DIR/taxilibre-backend" ]; then
        echo "- Backend: ✅" >> "$REPORT_FILE"
    fi
    
    if [ -d "$PROJECT_DIR/apps/admin/web" ]; then
        echo "- Admin Web: ✅" >> "$REPORT_FILE"
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

📁 STRUCTURE CRÉÉE:
- apps/admin/web
- apps/passenger/web
- apps/passenger/mobile
- apps/driver/web
- shared/types
- shared/utils
- shared/constants
- docs/
- scripts/

🔧 PROCHAINES ÉTAPES:
1. Configurer .env avec vos clés API
2. Initialiser Firebase: firebase login
3. Déployer: ./scripts/deploy.sh

📞 SUPPORT:
- Documentation: https://docs.taxilibre.com
- GitHub: https://github.com/shopdstok/taxilibre2
- Email: support@taxilibre.com
EOF
    
    log_success "Rapport généré: $REPORT_FILE"
}

# Fonction principale
main() {
    echo ""
    log_info "🚗 Installation TaxiLibre v1.0.0"
    echo ""
    
    check_system
    echo ""
    
    install_nodejs
    echo ""
    
    install_firebase
    echo ""
    
    install_vercel
    echo ""
    
    install_react_native
    echo ""
    
    setup_git
    echo ""
    
    setup_environment
    echo ""
    
    install_dependencies
    echo ""
    
    setup_firebase
    echo ""
    
    setup_docker
    echo ""
    
    setup_react_native
    echo ""
    
    run_tests
    echo ""
    
    generate_report
    echo ""
    
    log_success "🎉 Installation TaxiLibre terminée avec succès !"
    echo ""
    log_info "Prochaines étapes :"
    log_info "1. Éditer .env avec vos clés API"
    log_info "2. Lancer le développement : npm run dev"
    log_info "3. Déployer : ./scripts/deploy.sh"
    echo ""
    log_success "🚗 Votre plateforme VTC est prête !"
}

# Gestion erreurs
trap 'log_error "Installation échouée à l étape $LINENO"; exit 1' ERR

# Exécution
main "$@"
