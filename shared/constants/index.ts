// 🚗 TaxiLibre - Constantes Partagées

export const APP_CONFIG = {
  NAME: 'TaxiLibre',
  VERSION: '1.0.0',
  DESCRIPTION: 'Application Taxi/VTC mondiale',
  AUTHOR: 'TaxiLibre Team',
  WEBSITE: 'https://taxilibre.com',
  SUPPORT_EMAIL: 'support@taxilibre.com',
} as const;

export const API_ENDPOINTS = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  AUTH: '/auth',
  USERS: '/users',
  DRIVERS: '/drivers',
  RIDES: '/rides',
  PAYMENTS: '/payments',
  NOTIFICATIONS: '/notifications',
  LOCATIONS: '/locations',
  DOCUMENTS: '/documents',
  SUPPORT: '/support',
} as const;

export const FIREBASE_CONFIG = {
  API_KEY: process.env.REACT_APP_FIREBASE_API_KEY,
  AUTH_DOMAIN: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  PROJECT_ID: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  STORAGE_BUCKET: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  MESSAGING_SENDER_ID: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  APP_ID: process.env.REACT_APP_FIREBASE_APP_ID,
  MEASUREMENT_ID: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
} as const;

export const STRIPE_CONFIG = {
  PUBLISHABLE_KEY: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY,
  SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
} as const;

export const GOOGLE_MAPS_CONFIG = {
  API_KEY: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  DEFAULT_CENTER: { lat: 48.8566, lng: 2.3522 }, // Paris
  DEFAULT_ZOOM: 13,
  MAX_ZOOM: 20,
  MIN_ZOOM: 3,
} as const;

export const VEHICLE_TYPES = {
  STANDARD: {
    type: 'standard',
    name: 'Standard',
    description: 'Voiture standard 4 places',
    maxPassengers: 4,
    basePrice: 2.50,
    pricePerKm: 1.20,
    pricePerMin: 0.30,
    icon: '🚗',
  },
  PREMIUM: {
    type: 'premium',
    name: 'Premium',
    description: 'Voiture premium 4 places',
    maxPassengers: 4,
    basePrice: 4.00,
    pricePerKm: 1.80,
    pricePerMin: 0.45,
    icon: '🚙',
  },
  XL: {
    type: 'xl',
    name: 'XL',
    description: 'Grand véhicule 6-7 places',
    maxPassengers: 7,
    basePrice: 6.00,
    pricePerKm: 2.50,
    pricePerMin: 0.60,
    icon: '🚐',
  },
  TAXI: {
    type: 'taxi',
    name: 'Taxi',
    description: 'Taxi officiel',
    maxPassengers: 4,
    basePrice: 3.00,
    pricePerKm: 1.50,
    pricePerMin: 0.35,
    icon: '🚕',
  },
} as const;

export const PAYMENT_METHODS = {
  CARD: {
    type: 'card',
    name: 'Carte bancaire',
    description: 'Payer par carte',
    icon: '💳',
    enabled: true,
  },
  PAYPAL: {
    type: 'paypal',
    name: 'PayPal',
    description: 'Payer avec PayPal',
    icon: '🅿️',
    enabled: true,
  },
  CASH: {
    type: 'cash',
    name: 'Espèces',
    description: 'Payer en espèces',
    icon: '💵',
    enabled: true,
  },
  WALLET: {
    type: 'wallet',
    name: 'Portefeuille',
    description: 'Utiliser le solde TaxiLibre',
    icon: '👛',
    enabled: true,
  },
} as const;

export const RIDE_STATUS = {
  REQUESTED: {
    value: 'requested',
    name: 'Demandée',
    color: '#FFA500',
    icon: '⏳',
  },
  ASSIGNED: {
    value: 'assigned',
    name: 'Assignée',
    color: '#4169E1',
    icon: '👤',
  },
  DRIVER_ARRIVED: {
    value: 'driver_arrived',
    name: 'Chauffeur arrivé',
    color: '#32CD32',
    icon: '📍',
  },
  IN_PROGRESS: {
    value: 'in_progress',
    name: 'En cours',
    color: '#1E90FF',
    icon: '🚗',
  },
  COMPLETED: {
    value: 'completed',
    name: 'Terminée',
    color: '#228B22',
    icon: '✅',
  },
  CANCELLED: {
    value: 'cancelled',
    name: 'Annulée',
    color: '#DC143C',
    icon: '❌',
  },
} as const;

export const USER_ROLES = {
  ADMIN: {
    value: 'admin',
    name: 'Administrateur',
    permissions: ['read', 'write', 'delete', 'manage_users', 'manage_drivers', 'manage_rides'],
    icon: '👑',
  },
  DRIVER: {
    value: 'driver',
    name: 'Chauffeur',
    permissions: ['read', 'write', 'accept_rides', 'manage_profile'],
    icon: '🚗',
  },
  PASSENGER: {
    value: 'passenger',
    name: 'Passager',
    permissions: ['read', 'write', 'book_rides', 'manage_profile'],
    icon: '👤',
  },
} as const;

export const DOCUMENT_TYPES = {
  LICENSE: {
    type: 'license',
    name: 'Permis de conduire',
    description: 'Permis de conduire valide',
    required: true,
    icon: '📋',
  },
  INSURANCE: {
    type: 'insurance',
    name: 'Assurance véhicule',
    description: 'Certificat d\'assurance',
    required: true,
    icon: '🛡️',
  },
  REGISTRATION: {
    type: 'registration',
    name: 'Carte grise',
    description: 'Carte grise du véhicule',
    required: true,
    icon: '📄',
  },
  ID_CARD: {
    type: 'id_card',
    name: 'Carte d\'identité',
    description: 'Pièce d\'identité',
    required: true,
    icon: '🆔',
  },
  PASSPORT: {
    type: 'passport',
    name: 'Passeport',
    description: 'Passeport valide',
    required: false,
    icon: '🛂',
  },
} as const;

export const NOTIFICATION_TYPES = {
  RIDE_REQUESTED: {
    type: 'ride_requested',
    title: 'Nouvelle course',
    body: 'Une nouvelle course est disponible',
    icon: '🚗',
  },
  RIDE_ASSIGNED: {
    type: 'ride_assigned',
    title: 'Course assignée',
    body: 'Un chauffeur a accepté votre course',
    icon: '✅',
  },
  RIDE_STARTED: {
    type: 'ride_started',
    title: 'Course démarrée',
    body: 'Votre course a commencé',
    icon: '🚀',
  },
  RIDE_COMPLETED: {
    type: 'ride_completed',
    title: 'Course terminée',
    body: 'Votre course est terminée',
    icon: '🏁',
  },
  RIDE_CANCELLED: {
    type: 'ride_cancelled',
    title: 'Course annulée',
    body: 'La course a été annulée',
    icon: '❌',
  },
  PAYMENT_PROCESSED: {
    type: 'payment_processed',
    title: 'Paiement effectué',
    body: 'Votre paiement a été traité',
    icon: '💳',
  },
  DRIVER_APPROVED: {
    type: 'driver_approved',
    title: 'Compte approuvé',
    body: 'Votre compte chauffeur est approuvé',
    icon: '✅',
  },
  DRIVER_REJECTED: {
    type: 'driver_rejected',
    title: 'Compte rejeté',
    body: 'Votre compte chauffeur a été rejeté',
    icon: '❌',
  },
} as const;

export const SUPPORT_CATEGORIES = {
  RIDE_ISSUE: {
    value: 'ride_issue',
    name: 'Problème de course',
    description: 'Problème survenu pendant une course',
    icon: '🚗',
  },
  PAYMENT_PROBLEM: {
    value: 'payment_problem',
    name: 'Problème de paiement',
    description: 'Difficulté avec un paiement',
    icon: '💳',
  },
  ACCOUNT_HELP: {
    value: 'account_help',
    name: 'Aide compte',
    description: 'Questions sur votre compte',
    icon: '👤',
  },
  TECHNICAL_ISSUE: {
    value: 'technical_issue',
    name: 'Problème technique',
    description: 'Bug ou problème technique',
    icon: '🔧',
  },
  OTHER: {
    value: 'other',
    name: 'Autre',
    description: 'Autre demande',
    icon: '📝',
  },
} as const;

export const VALIDATION_RULES = {
  NAME: {
    minLength: 2,
    maxLength: 50,
    required: true,
    pattern: /^[a-zA-Z\s'-]+$/,
    message: 'Le nom doit contenir entre 2 et 50 caractères',
  },
  EMAIL: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Veuillez entrer une adresse email valide',
  },
  PHONE: {
    minLength: 10,
    maxLength: 20,
    required: false,
    pattern: /^\+?[\d\s\-\(\)]+$/,
    message: 'Veuillez entrer un numéro de téléphone valide',
  },
  PASSWORD: {
    minLength: 8,
    maxLength: 128,
    required: true,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    message: 'Le mot de passe doit contenir 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial',
  },
  ADDRESS: {
    minLength: 5,
    maxLength: 200,
    required: true,
    message: 'Veuillez entrer une adresse valide',
  },
  LICENSE_PLATE: {
    minLength: 5,
    maxLength: 15,
    required: true,
    pattern: /^[A-Z0-9\s-]+$/,
    message: 'Veuillez entrer une plaque d\'immatriculation valide',
  },
} as const;

export const LIMITS = {
  MAX_RIDE_DISTANCE: 500, // km
  MAX_RIDE_DURATION: 720, // minutes (12 hours)
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_RATING: 5,
  MIN_RATING: 1,
  MAX_CANCELLATION_RATE: 0.3, // 30%
  MAX_COMMISSION_RATE: 0.30, // 30%
  MIN_DRIVER_AGE: 21,
  MAX_DRIVER_AGE: 70,
  MIN_VEHICLE_YEAR: 2008,
  MAX_UPLOAD_ATTEMPTS: 3,
} as const;

export const TIME_CONSTANTS = {
  TOKEN_REFRESH_INTERVAL: 50 * 60 * 1000, // 50 minutes
  LOCATION_UPDATE_INTERVAL: 5000, // 5 seconds
  NOTIFICATION_CHECK_INTERVAL: 30000, // 30 seconds
  RIDE_REQUEST_TIMEOUT: 30000, // 30 seconds
  DRIVER_RESPONSE_TIMEOUT: 15000, // 15 seconds
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
} as const;

export const MAP_CONSTANTS = {
  DEFAULT_BOUNDS: {
    north: 51.089, // Nord de la France
    south: 41.342, // Sud de la France
    east: 9.560,  // Est de la France
    west: -5.142, // Ouest de la France
  },
  DRIVER_SEARCH_RADIUS: 5000, // 5km
  CLUSTERING_MAX_ZOOM: 14,
  ANIMATION_DURATION: 300, // milliseconds
  MARKER_SIZE: 40,
  POLYLINE_STROKE_COLOR: '#1E90FF',
  POLYLINE_STROKE_WIDTH: 4,
  POLYLINE_STROKE_OPACITY: 0.8,
} as const;

export const COLORS = {
  PRIMARY: '#1E90FF',
  SECONDARY: '#32CD32',
  SUCCESS: '#228B22',
  WARNING: '#FFA500',
  ERROR: '#DC143C',
  INFO: '#4169E1',
  LIGHT: '#F8F9FA',
  DARK: '#212529',
  MUTED: '#6C757D',
  WHITE: '#FFFFFF',
  BLACK: '#000000',
} as const;

export const BREAKPOINTS = {
  XS: 0,
  SM: 576,
  MD: 768,
  LG: 992,
  XL: 1200,
  XXL: 1400,
} as const;

export const ANIMATIONS = {
  DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
  },
  EASING: {
    EASE_IN: 'ease-in',
    EASE_OUT: 'ease-out',
    EASE_IN_OUT: 'ease-in-out',
  },
} as const;
