// API Configuration
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3003/api';
export const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'http://localhost:3003';

// API Endpoints
export const endpoints = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',
    CHANGE_PASSWORD: '/auth/change-password',
  },
  
  // Users
  USERS: {
    PROFILE: '/users/profile',
    RIDE_HISTORY: '/users/rides',
    STATISTICS: '/users/statistics',
    NOTIFICATIONS: '/users/notifications',
    AVATAR: '/users/avatar',
  },
  
  // Drivers
  DRIVERS: {
    REGISTER: '/drivers/register',
    PROFILE: '/drivers/profile',
    STATUS: '/drivers/status',
    DOCUMENTS: '/drivers/documents',
    EARNINGS: '/drivers/earnings',
    RIDES: '/drivers/rides',
    ACTIVE_RIDE: '/drivers/active-ride',
    STATISTICS: '/drivers/statistics',
    NEARBY_REQUESTS: '/drivers/nearby-requests',
  },
  
  // Rides
  RIDES: {
    REQUEST: '/rides/request',
    ACCEPT: '/rides/:id/accept',
    START: '/rides/:id/start',
    COMPLETE: '/rides/:id/complete',
    CANCEL: '/rides/:id/cancel',
    HISTORY: '/rides/history',
    ACTIVE: '/rides/active',
    DETAILS: '/rides/:id',
    TRACK: '/rides/:id/track',
    ESTIMATE: '/rides/estimate',
  },
  
  // Payments
  PAYMENTS: {
    CREATE_INTENT: '/payments/create-intent',
    CONFIRM: '/payments/confirm',
    DETAILS: '/payments/:id',
    HISTORY: '/payments/history',
    EARNINGS: '/payments/earnings',
    PAYOUT: '/payments/payout',
    PAYOUT_HISTORY: '/payments/payouts',
  },
  
  // Reviews
  REVIEWS: {
    CREATE: '/reviews',
    DRIVER_REVIEWS: '/reviews/driver/:driverId',
    DETAILS: '/reviews/:id',
    RESPOND: '/reviews/:id/respond',
  },
  
  // Locations
  LOCATIONS: {
    SEARCH: '/locations/search',
    GEOCODE: '/locations/geocode',
    REVERSE_GEOCODE: '/locations/reverse-geocode',
    DIRECTIONS: '/locations/directions',
  },
  
  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: '/notifications/:id/read',
    MARK_ALL_READ: '/notifications/read-all',
    DELETE: '/notifications/:id',
    PREFERENCES: '/notifications/preferences',
  },
};

// HTTP Status Codes
export const statusCodes = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Error Types
export const errorTypes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RATE_LIMIT: 'RATE_LIMIT',
};

// Request/Response Types
export const requestTypes = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
};

// Content Types
export const contentTypes = {
  JSON: 'application/json',
  FORM_DATA: 'multipart/form-data',
  URLENCODED: 'application/x-www-form-urlencoded',
};

// Cache Configuration
export const cacheConfig = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  userCacheTTL: 10 * 60 * 1000, // 10 minutes
  rideCacheTTL: 30 * 1000, // 30 seconds
  locationCacheTTL: 60 * 1000, // 1 minute
};

// Pagination Defaults
export const pagination = {
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
};

// File Upload Limits
export const uploadLimits = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedDocumentTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  maxFiles: 5,
};

// WebSocket Events
export const socketEvents = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Passenger events
  RIDE_REQUESTED: 'ride_requested',
  RIDE_ACCEPTED: 'ride_accepted',
  DRIVER_ARRIVED: 'driver_arrived',
  RIDE_STARTED: 'ride_started',
  RIDE_COMPLETED: 'ride_completed',
  RIDE_CANCELLED: 'ride_cancelled',
  DRIVER_LOCATION_UPDATE: 'driver_location_update',
  
  // Driver events
  RIDE_REQUEST: 'ride_request',
  RIDE_RESPONSE: 'ride_response',
  RIDE_CANCELLED_BY_PASSENGER: 'ride_cancelled_by_passenger',
  
  // Common events
  CHAT_MESSAGE: 'chat_message',
  NOTIFICATION: 'notification',
  LOCATION_UPDATE: 'location_update',
  STATUS_UPDATE: 'status_update',
};

// Ride Status
export const rideStatus = {
  REQUESTED: 'requested',
  ACCEPTED: 'accepted',
  DRIVER_ARRIVING: 'driver_arriving',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_DRIVER_AVAILABLE: 'no_driver_available',
};

// Driver Status
export const driverStatus = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  BUSY: 'busy',
  UNAVAILABLE: 'unavailable',
};

// User Roles
export const userRoles = {
  PASSENGER: 'passenger',
  DRIVER: 'driver',
  ADMIN: 'admin',
};

// Vehicle Types
export const vehicleTypes = {
  SEDAN: 'sedan',
  SUV: 'suv',
  VAN: 'van',
  LUXURY: 'luxury',
  MOTORCYCLE: 'motorcycle',
  ELECTRIC: 'electric',
};

// Payment Methods
export const paymentMethods = {
  CARD: 'card',
  CASH: 'cash',
  DIGITAL_WALLET: 'digital_wallet',
  BANK_TRANSFER: 'bank_transfer',
};

// Notification Types
export const notificationTypes = {
  RIDE_REQUESTED: 'ride_requested',
  RIDE_ACCEPTED: 'ride_accepted',
  RIDE_STARTED: 'ride_started',
  RIDE_COMPLETED: 'ride_completed',
  RIDE_CANCELLED: 'ride_cancelled',
  DRIVER_ARRIVED: 'driver_arrived',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  DRIVER_APPROVED: 'driver_approved',
  DRIVER_REJECTED: 'driver_rejected',
  PROMOTION: 'promotion',
  SYSTEM: 'system',
};

// Map Configuration
export const mapConfig = {
  defaultRegion: {
    latitude: 40.7128,
    longitude: -74.0060,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  maxZoom: 20,
  minZoom: 2,
  defaultZoom: 15,
};

// Location Configuration
export const locationConfig = {
  updateInterval: 5000, // 5 seconds
  accuracyThreshold: 10, // 10 meters
  maxAge: 60000, // 1 minute
  timeout: 10000, // 10 seconds
};

// App Configuration
export const appConfig = {
  name: 'TaxiLibre',
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  debug: process.env.NODE_ENV === 'development',
};
