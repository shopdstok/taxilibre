import axios from 'axios';

const API_BASE_URL = import.meta.env?.VITE_API_URL || process.env?.VITE_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request in development
    if (import.meta.env?.MODE === 'development' || process.env?.NODE_ENV === 'development') {
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with automatic token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (import.meta.env?.MODE === 'development' || process.env?.NODE_ENV === 'development') {
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Log error in development
    if (import.meta.env?.MODE === 'development' || process.env?.NODE_ENV === 'development') {
    }
    
    // Handle 401 errors with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const refreshResp = await axios.post(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          { refreshToken }
        );
        
        const { accessToken } = refreshResp.data.data;
        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect to login
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        
        // Only redirect if not already on login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    // Retry on network errors (5xx or network error)
    if (!error.response && !originalRequest._retryCount) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      
      if (originalRequest._retryCount <= 3) {
        return new Promise((resolve) => {
          setTimeout(() => resolve(api(originalRequest)), 1000 * originalRequest._retryCount);
        });
      }
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (credentials) => api.post('/api/v1/auth/login', credentials),
  register: (userData) => api.post('/api/v1/auth/register', userData),
  getProfile: () => api.get('/api/v1/auth/profile'),
  updateProfile: (data) => api.put('/api/v1/auth/profile', data),
  changePassword: (data) => api.put('/api/v1/auth/change-password', data),
  logout: () => api.post('/api/v1/auth/logout'),
  refreshToken: () => api.post('/api/v1/auth/refresh'),
};

export const userAPI = {
  getProfile: () => api.get('/api/v1/users/profile'),
  updateProfile: (data) => api.put('/api/v1/users/profile', data),
  uploadAvatar: (formData) => api.post('/api/v1/users/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getRideHistory: (params) => api.get('/api/v1/users/rides', { params }),
  getStatistics: () => api.get('/api/v1/users/statistics'),
  updateNotificationPreferences: (data) => api.put('/api/v1/users/notifications', data),
  deleteAccount: () => api.delete('/api/v1/users/account'),
};

export const driverAPI = {
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
};

export const rideAPI = {
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
};

export const paymentAPI = {
  createPaymentIntent: (data) => api.post('/api/v1/payments/create-intent', data),
  confirmPayment: (data) => api.post('/api/v1/payments/confirm', data),
  getPaymentDetails: (paymentId) => api.get(`/api/v1/payments/${paymentId}`),
  getPaymentHistory: (params) => api.get('/api/v1/payments/history', { params }),
  refundPayment: (paymentId, reason) => api.post(`/api/v1/payments/${paymentId}/refund`, { reason }),
  getEarnings: (params) => api.get('/api/v1/payments/earnings', { params }),
  requestPayout: (data) => api.post('/api/v1/payments/payout', data),
  getPayoutHistory: (params) => api.get('/api/v1/payments/payouts', { params }),
};

export const reviewAPI = {
  createReview: (data) => api.post('/api/v1/reviews', data),
  getReview: (reviewId) => api.get(`/api/v1/reviews/${reviewId}`),
  getDriverReviews: (driverId, params) => api.get(`/api/v1/reviews/driver/${driverId}`, { params }),
  updateReview: (reviewId, data) => api.put(`/api/v1/reviews/${reviewId}`, data),
  deleteReview: (reviewId) => api.delete(`/api/v1/reviews/${reviewId}`),
  markHelpful: (reviewId) => api.post(`/api/v1/reviews/${reviewId}/helpful`),
  reportReview: (reviewId, reason) => api.post(`/api/v1/reviews/${reviewId}/report`, { reason }),
  respondToReview: (reviewId, response) => api.put(`/api/v1/reviews/${reviewId}/respond`, { response }),
};

export const locationAPI = {
  searchPlaces: (query) => api.get('/api/v1/locations/search', { params: { query } }),
  geocode: (address) => api.get('/api/v1/locations/geocode', { params: { address } }),
  reverseGeocode: (lat, lng) => api.get('/api/v1/locations/reverse-geocode', { params: { lat, lng } }),
  getDirections: (origin, destination) => api.post('/api/v1/locations/directions', { origin, destination }),
  calculateDistance: (data) => api.post('/api/v1/locations/distance', data),
  getETA: (data) => api.post('/api/v1/locations/eta', data),
};

export const notificationAPI = {
  getNotifications: (params) => api.get('/api/v1/notifications', { params }),
  markAsRead: (notificationId) => api.put(`/api/v1/notifications/${notificationId}/read`),
  markAllAsRead: () => api.put('/api/v1/notifications/read-all'),
  deleteNotification: (notificationId) => api.delete(`/api/v1/notifications/${notificationId}`),
  updatePreferences: (data) => api.put('/api/v1/notifications/preferences', data),
};

export const adminAPI = {
  getDashboard: () => api.get('/api/v1/admin/dashboard'),
  getUsers: (params) => api.get('/api/v1/admin/users', { params }),
  getDrivers: (params) => api.get('/api/v1/admin/drivers', { params }),
  getRides: (params) => api.get('/api/v1/admin/rides', { params }),
  getEarnings: (params) => api.get('/api/v1/admin/earnings', { params }),
  updateUserStatus: (userId, status) => api.put(`/api/v1/admin/users/${userId}/status`, { status }),
  updateDriverStatus: (driverId, status) => api.put(`/api/v1/admin/drivers/${driverId}/status`, { status }),
  suspendUser: (userId, reason) => api.post(`/api/v1/admin/users/${userId}/suspend`, { reason }),
  suspendDriver: (driverId, reason) => api.post(`/api/v1/admin/drivers/${driverId}/suspend`, { reason }),
  deleteReview: (reviewId) => api.delete(`/api/v1/admin/reviews/${reviewId}`),
  getReports: (params) => api.get('/api/v1/admin/reports', { params }),
  getSettings: () => api.get('/api/v1/admin/settings'),
  updateSettings: (settings) => api.put('/api/v1/admin/settings', settings),
  approveDriver: (driverId) => api.put(`/api/v1/admin/drivers/${driverId}/approve`),
  rejectDriver: (driverId, reason) => api.put(`/api/v1/admin/drivers/${driverId}/reject`, { reason })
};

export default api;

export const adminAPI = {
  ...adminAPI,
  approveDriver: (driverId) => api.put(`/api/v1/admin/drivers/${driverId}/approve`),
  rejectDriver: (driverId, reason) => api.put(`/api/v1/admin/drivers/${driverId}/reject`, { reason })
  approveDriver: (driverId) => api.put(`/api/v1/admin/drivers/${driverId}/approve`),
  rejectDriver: (driverId, reason) => api.put(`/api/v1/admin/drivers/${driverId}/reject`, { reason })
};
