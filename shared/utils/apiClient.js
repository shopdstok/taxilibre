PowerShell 7.6.4
PS C:\Users\shams\Desktop\taxilibre> # Voir la structure du dossier shared
PS C:\Users\shams\Desktop\taxilibre> Get-ChildItem -Path "shared" -Recurse | Select-Object FullName

FullName
--------
C:\Users\shams\Desktop\taxilibre\shared\constants
C:\Users\shams\Desktop\taxilibre\shared\src
C:\Users\shams\Desktop\taxilibre\shared\stores
C:\Users\shams\Desktop\taxilibre\shared\types
C:\Users\shams\Desktop\taxilibre\shared\utils
C:\Users\shams\Desktop\taxilibre\shared\constants\index.ts
C:\Users\shams\Desktop\taxilibre\shared\src\utils
C:\Users\shams\Desktop\taxilibre\shared\src\utils\logger.js
C:\Users\shams\Desktop\taxilibre\shared\stores\authStore.js
C:\Users\shams\Desktop\taxilibre\shared\types\index.ts
C:\Users\shams\Desktop\taxilibre\shared\utils\apiClient.js
C:\Users\shams\Desktop\taxilibre\shared\utils\index.ts

PS C:\Users\shams\Desktop\taxilibre>
PS C:\Users\shams\Desktop\taxilibre> # Voir le fichier apiClient
PS C:\Users\shams\Desktop\taxilibre> Get-Content shared\utils\apiClient.js
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
      getDashboard: () => api.get('/api/v1/admin/dashboard'),
      getDrivers: () => api.get('/api/v1/admin/drivers'),
      getDriverDetails: (driverId) => api.get(`/api/v1/admin/drivers/${driverId}`),
      updateDriverStatus: (driverId, status) => api.put(`/api/v1/admin/drivers/${driverId}/status`, status),
      suspendDriver: (driverId, reason) => api.post(`/api/v1/admin/drivers/${driverId}/suspend`, { reason }),
      deleteDriver: (driverId) => api.delete(`/api/v1/admin/drivers/${driverId}`),
      getRides: (params) => api.get('/api/v1/admin/rides', { params }),
      getRideDetails: (rideId) => api.get(`/api/v1/admin/rides/${rideId}`),
      updateRideStatus: (rideId, status) => api.put(`/api/v1/admin/rides/${rideId}/status`, { status }),
      getUsers: (params) => api.get('/api/v1/admin/users', { params }),
      getUserDetails: (userId) => api.get(`/api/v1/admin/users/${userId}`),
      updateUserStatus: (userId, isActive) => api.put(`/api/v1/admin/users/${userId}/status`, { isActive }),
      deleteUser: (userId) => api.delete(`/api/v1/admin/users/${userId}`),
      getRevenue: (params) => api.get('/api/v1/admin/revenue', { params }),
      getSupportTickets: (params) => api.get('/api/v1/admin/support', { params }),
      updateSupportTicket: (ticketId, data) => api.put(`/api/v1/admin/support/${ticketId}`, data),
      getSettings: () => api.get('/api/v1/admin/settings'),
      updateSettings: (data) => api.put('/api/v1/admin/settings', data),
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

// URL de l'API backend (variable d'environnement Vite ou fallback)
const API_BASE_URL = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : (typeof process !== 'undefined' && process.env?.VITE_API_URL)
    ? process.env.VITE_API_URL
    : '';

// Création d'une instance Axios avec intercepteur auth
const defaultApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Intercepteur: attacher le token JWT automatiquement
defaultApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Intercepteur: refresh automatique si 401
defaultApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const res = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, { refreshToken });
          const { accessToken } = res.data.data.tokens;
          localStorage.setItem('accessToken', accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return defaultApi(originalRequest);
        }
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Création des services avec cette instance
const defaultServices = createApiServices(defaultApi);
export const api = defaultApi;
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
PS C:\Users\shams\Desktop\taxilibre>
PS C:\Users\shams\Desktop\taxilibre> # Voir le authStore partagé
PS C:\Users\shams\Desktop\taxilibre> Get-Content shared\stores\authStore.js
import { create } from 'zustand';
import { authAPI } from '../utils/apiClient.js';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('accessToken') || null,
  refreshToken: localStorage.getItem('refreshToken') || null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
  error: null,

  setLoading: (loading) => set({ isLoading: loading, error: null }),
  setError: (error) => set({ error, isLoading: false }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.login({ email, password });
      const { user, tokens } = response.data.data;
      const { accessToken, refreshToken } = tokens;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      set({
        user,
        token: accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Login failed';
      set({ error: message, isLoading: false, isAuthenticated: false });
      return { success: false, error: message };
    }
  },

  register: async (name, email, phone, password, role = 'passenger') => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.register({ name, email, phone, password, role });
      const { user, tokens } = response.data.data;
      const { accessToken, refreshToken } = tokens;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      set({
        user,
        token: accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Registration failed';
      set({ error: message, isLoading: false, isAuthenticated: false });
      return { success: false, error: message };
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      return false;
    }

    set({ isLoading: true });
    try {
      const response = await authAPI.getProfile();
      set({
        user: response.data.data,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      return true;
    } catch (error) {
      // Tentative de rafraîchissement du token
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const refreshResponse = await authAPI.refreshToken();
          const { accessToken, user } = refreshResponse.data.data;
          localStorage.setItem('accessToken', accessToken);
          set({
            user,
            token: accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
          return true;
        } catch {
          // Refresh échoué
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Session expired. Please login again.'
          });
          return false;
        }
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Session expired. Please login again.'
        });
        return false;
      }
    }
  },

  // ✅ AJOUT : méthode initialize pour initialiser le store au démarrage
  initialize: () => {
    const state = get();
    if (state.token) {
      // Si un token existe, on charge l'utilisateur
      state.checkAuth();
    } else {
      // Sinon, on s'assure que l'état est propre
      set({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    }
  },

  // Autres méthodes (sendPhoneOTP, verifyPhoneOTP, etc.)...
  // ... (gardez vos autres méthodes ici)
}));
PS C:\Users\shams\Desktop\taxilibre>