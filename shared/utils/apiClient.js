import axios from 'axios';

// Factory to create API service objects given an axios instance
export default function createApiServices(api) {
  return {
    authAPI: {
      login: (credentials) => api.post('/api/v1/auth/login', credentials),
      register: (userData) => api.post('/api/v1/auth/register', userData),
      getProfile: () => api.get('/api/v1/auth/profile'),
      updateProfile: (data) => api.put('/api/v1/auth/profile', data),
      changePassword: (data) => api.put('/api/v1/auth/change-password', data),
      logout: () => api.post('/api/v1/auth/logout'),
      refreshToken: () => api.post('/api/v1/auth/refresh'),
    },
    userAPI: {
      getProfile: () => api.get('/api/v1/users/profile'),
      updateProfile: (data) => api.put('/api/v1/users/profile', data),
      uploadAvatar: (formData) => api.post('/api/v1/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
      getRideHistory: (params) => api.get('/api/v1/users/rides', { params }),
      getStatistics: () => api.get('/api/v1/users/statistics'),
      updateNotificationPreferences: (data) => api.put('/api/v1/users/notifications', data),
      deleteAccount: () => api.delete('/api/v1/users/account'),
    },
    driverAPI: {
      register: (userData) => api.post('/api/v1/drivers/register', userData),
      getProfile: () => api.get('/api/v1/drivers/profile'),
      updateProfile: (data) => api.put('/api/v1/drivers/profile', data),
      updateStatus: (status) => api.put('/api/v1/drivers/status', { status }),
      uploadDocuments: (formData) => api.post('/api/v1/drivers/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
      getEarnings: (params) => api.get('/api/v1/drivers/earnings', { params }),
      getRides: (params) => api.get('/api/v1/drivers/rides', { params }),
      getActiveRide: () => api.get('/api/v1/drivers/active-ride'),
      getStatistics: () => api.get('/api/v1/drivers/statistics'),
      getNearbyRequests: (params) => api.get('/api/v1/drivers/nearby-requests', { params }),
      getNotifications: () => api.get('/api/v1/drivers/notifications'),
      markNotificationAsRead: (notificationId) => api.put(`/api/v1/drivers/notifications/${notificationId}/read`),
    },
    rideAPI: {
      requestRide: (data) => api.post('/api/v1/rides/request', data),
      acceptRide: (rideId) => api.post(`/api/v1/rides/${rideId}/accept`),
      startRide: (rideId) => api.post(`/api/v1/rides/${rideId}/start`),
      completeRide: (rideId) => api.post(`/api/v1/rides/${rideId}/complete`),
      cancelRide: (rideId, reason) => api.post(`/api/v1/rides/${rideId}/cancel`, { reason }),
      getRideDetails: (rideId) => api.get(`/api/v1/rides/${rideId}`),
      getActiveRide: () => api.get('/api/v1/rides/active'),
      getRideHistory: (params) => api.get('/api/v1/rides/history', { params }),
      estimatePrice: (data) => api.post('/api/v1/rides/estimate', data),
      trackRide: (rideId) => api.get(`/api/v1/rides/${rideId}/track`),
    },
    paymentAPI: {
      createPaymentIntent: (data) => api.post('/api/v1/payments/create-intent', data),
      confirmPayment: (data) => api.post('/api/v1/payments/confirm', data),
      getPaymentDetails: (paymentId) => api.get(`/api/v1/payments/${paymentId}`),
      getPaymentHistory: (params) => api.get('/api/v1/payments/history', { params }),
      refundPayment: (paymentId, reason) => api.post(`/api/v1/payments/${paymentId}/refund`, { reason }),
      getEarnings: (params) => api.get('/api/v1/payments/earnings', { params }),
      requestPayout: (data) => api.post('/api/v1/payments/payout', data),
      getPayoutHistory: (params) => api.get('/api/v1/payments/payouts', { params }),
    },
    // ✅ AJOUT ADMIN API
    adminAPI: {
      getDrivers: () => api.get('/api/v1/admin/drivers'),
      getDriverDetails: (driverId) => api.get(`/api/v1/admin/drivers/${driverId}`),
      updateDriverStatus: (driverId, status) => api.put(`/api/v1/admin/drivers/${driverId}/status`, status),
      suspendDriver: (driverId, reason) => api.post(`/api/v1/admin/drivers/${driverId}/suspend`, { reason }),
      deleteDriver: (driverId) => api.delete(`/api/v1/admin/drivers/${driverId}`),
      getRides: (params) => api.get('/api/v1/admin/rides', { params }),
      getUsers: (params) => api.get('/api/v1/admin/users', { params }),
      getRevenue: (params) => api.get('/api/v1/admin/revenue', { params }),
      getSupportTickets: (params) => api.get('/api/v1/admin/support', { params }),
    },
    reviewAPI: {
      createReview: (data) => api.post('/api/v1/reviews', data),
      getReview: (reviewId) => api.get(`/api/v1/reviews/${reviewId}`),
      getDriverReviews: (driverId, params) => api.get(`/api/v1/reviews/driver/${driverId}`, { params }),
      updateReview: (reviewId, data) => api.put(`/api/v1/reviews/${reviewId}`, data),
      deleteReview: (reviewId) => api.delete(`/api/v1/reviews/${reviewId}`),
      markHelpful: (reviewId) => api.post(`/api/v1/reviews/${reviewId}/helpful`),
      reportReview: (reviewId, reason) => api.post(`/api/v1/reviews/${reviewId}/report`, { reason }),
      respondToReview: (reviewId, response) => api.put(`/api/v1/reviews/${reviewId}/respond`, { response }),
    },
    locationAPI: {
      searchPlaces: (query) => api.get('/api/v1/locations/search', { params: { query } }),
      geocode: (address) => api.get('/api/v1/locations/geocode', { params: { address } }),
      reverseGeocode: (lat, lng) => api.get('/api/v1/locations/reverse-geocode', { params: { lat, lng } }),
      getDirections: (origin, destination) => api.post('/api/v1/locations/directions', { origin, destination }),
      calculateDistance: (data) => api.post('/api/v1/locations/distance', data),
      getETA: (data) => api.post('/api/v1/locations/eta', data),
    },
    notificationAPI: {
      getNotifications: (params) => api.get('/api/v1/notifications', { params }),
      markAsRead: (notificationId) => api.put(`/api/v1/notifications/${notificationId}/read`),
      markAllAsRead: () => api.put('/api/v1/notifications/read-all'),
      deleteNotification: (notificationId) => api.delete(`/api/v1/notifications/${notificationId}`),
      updatePreferences: (data) => api.put('/api/v1/notifications/preferences', data),
    }
  };
}

// --- CRÉATION D'UNE INSTANCE PAR DÉFAUT ---

// Création d'une instance Axios par défaut (à adapter selon ton besoin)
const defaultApi = axios.create({
  baseURL: '', // ou l'URL réelle, tu peux utiliser une variable d'environnement
  headers: { 'Content-Type': 'application/json' },
});

// Création des services avec cette instance
const defaultServices = createApiServices(defaultApi);

// Export nommé de chaque service pour faciliter l'import
export const authAPI = defaultServices.authAPI;
export const userAPI = defaultServices.userAPI;
export const rideAPI = defaultServices.rideAPI;
export const paymentAPI = defaultServices.paymentAPI;
export const adminAPI = defaultServices.adminAPI;
export const reviewAPI = defaultServices.reviewAPI;
export const locationAPI = defaultServices.locationAPI;
export const notificationAPI = defaultServices.notificationAPI;

// On garde aussi l'export par défaut de la fonction createApiServices
export { createApiServices };