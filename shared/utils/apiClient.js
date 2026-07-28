import axios from 'axios';

// ─── URL Backend ──────────────────────────────────────────────────────────────
const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'https://backend-a9ve.onrender.com';

// ─── Factory ──────────────────────────────────────────────────────────────────
export default function createApiServices(api) {
  return {
    authAPI: {
      login:           (credentials) => api.post('/api/v1/auth/login', credentials),
      register:        (userData)    => api.post('/api/v1/auth/register', userData),
      getProfile:      ()            => api.get('/api/v1/auth/profile'),
      updateProfile:   (data)        => api.put('/api/v1/auth/profile', data),
      changePassword:  (data)        => api.put('/api/v1/auth/change-password', data),
      logout:          ()            => api.post('/api/v1/auth/logout'),
      refreshToken:    ()            => api.post('/api/v1/auth/refresh'),
    },
    userAPI: {
      getProfile:                    ()       => api.get('/api/v1/users/profile'),
      updateProfile:                 (data)   => api.put('/api/v1/users/profile', data),
      uploadAvatar:                  (form)   => api.post('/api/v1/users/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
      getRideHistory:                (params) => api.get('/api/v1/users/rides', { params }),
      getStatistics:                 ()       => api.get('/api/v1/users/statistics'),
      updateNotificationPreferences: (data)   => api.put('/api/v1/users/notifications', data),
      deleteAccount:                 ()       => api.delete('/api/v1/users/account'),
    },
    driverAPI: {
      register:               (data)   => api.post('/api/v1/drivers/register', data),
      getProfile:             ()       => api.get('/api/v1/drivers/profile'),
      updateProfile:          (data)   => api.put('/api/v1/drivers/profile', data),
      updateStatus:           (status) => api.put('/api/v1/drivers/status', { status }),
      uploadDocuments:        (form)   => api.post('/api/v1/drivers/documents', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
      getEarnings:            (params) => api.get('/api/v1/drivers/earnings', { params }),
      getRides:               (params) => api.get('/api/v1/drivers/rides', { params }),
      getActiveRide:          ()       => api.get('/api/v1/drivers/active-ride'),
      getStatistics:          ()       => api.get('/api/v1/drivers/statistics'),
      getNearbyRequests:      (params) => api.get('/api/v1/drivers/nearby-requests', { params }),
      getNotifications:       ()       => api.get('/api/v1/drivers/notifications'),
      markNotificationAsRead: (id)     => api.put(`/api/v1/drivers/notifications/${id}/read`),
    },
    rideAPI: {
      requestRide:    (data)          => api.post('/api/v1/rides/request', data),
      acceptRide:     (rideId)        => api.post(`/api/v1/rides/${rideId}/accept`),
      startRide:      (rideId)        => api.post(`/api/v1/rides/${rideId}/start`),
      completeRide:   (rideId)        => api.post(`/api/v1/rides/${rideId}/complete`),
      cancelRide:     (rideId, reason)=> api.post(`/api/v1/rides/${rideId}/cancel`, { reason }),
      getRideDetails: (rideId)        => api.get(`/api/v1/rides/${rideId}`),
      getActiveRide:  ()              => api.get('/api/v1/rides/active'),
      getRideHistory: (params)        => api.get('/api/v1/rides/history', { params }),
      estimatePrice:  (data)          => api.post('/api/v1/rides/estimate', data),
      trackRide:      (rideId)        => api.get(`/api/v1/rides/${rideId}/track`),
    },
    paymentAPI: {
      createPaymentIntent: (data)            => api.post('/api/v1/payments/create-intent', data),
      confirmPayment:      (data)            => api.post('/api/v1/payments/confirm', data),
      getPaymentDetails:   (id)              => api.get(`/api/v1/payments/${id}`),
      getPaymentHistory:   (params)          => api.get('/api/v1/payments/history', { params }),
      refundPayment:       (id, reason)      => api.post(`/api/v1/payments/${id}/refund`, { reason }),
      getEarnings:         (params)          => api.get('/api/v1/payments/earnings', { params }),
      requestPayout:       (data)            => api.post('/api/v1/payments/payout', data),
      getPayoutHistory:    (params)          => api.get('/api/v1/payments/payouts', { params }),
    },
    adminAPI: {
      getDashboard:        ()                => api.get('/api/v1/admin/dashboard'),
      getDrivers:          ()                => api.get('/api/v1/admin/drivers'),
      getDriverDetails:    (id)              => api.get(`/api/v1/admin/drivers/${id}`),
      updateDriverStatus:  (id, status)      => api.put(`/api/v1/admin/drivers/${id}/status`, status),
      suspendDriver:       (id, reason)      => api.post(`/api/v1/admin/drivers/${id}/suspend`, { reason }),
      deleteDriver:        (id)              => api.delete(`/api/v1/admin/drivers/${id}`),
      getRides:            (params)          => api.get('/api/v1/admin/rides', { params }),
      getRideDetails:      (id)              => api.get(`/api/v1/admin/rides/${id}`),
      updateRideStatus:    (id, status)      => api.put(`/api/v1/admin/rides/${id}/status`, { status }),
      getUsers:            (params)          => api.get('/api/v1/admin/users', { params }),
      getUserDetails:      (id)              => api.get(`/api/v1/admin/users/${id}`),
      updateUserStatus:    (id, isActive)    => api.put(`/api/v1/admin/users/${id}/status`, { isActive }),
      deleteUser:          (id)              => api.delete(`/api/v1/admin/users/${id}`),
      getRevenue:          (params)          => api.get('/api/v1/admin/revenue', { params }),
      getSupportTickets:   (params)          => api.get('/api/v1/admin/support', { params }),
      updateSupportTicket: (id, data)        => api.put(`/api/v1/admin/support/${id}`, data),
      getSettings:         ()                => api.get('/api/v1/admin/settings'),
      updateSettings:      (data)            => api.put('/api/v1/admin/settings', data),
    },
    reviewAPI: {
      createReview:     (data)          => api.post('/api/v1/reviews', data),
      getReview:        (id)            => api.get(`/api/v1/reviews/${id}`),
      getDriverReviews: (id, params)    => api.get(`/api/v1/reviews/driver/${id}`, { params }),
      updateReview:     (id, data)      => api.put(`/api/v1/reviews/${id}`, data),
      deleteReview:     (id)            => api.delete(`/api/v1/reviews/${id}`),
      markHelpful:      (id)            => api.post(`/api/v1/reviews/${id}/helpful`),
      reportReview:     (id, reason)    => api.post(`/api/v1/reviews/${id}/report`, { reason }),
      respondToReview:  (id, response)  => api.put(`/api/v1/reviews/${id}/respond`, { response }),
    },
    locationAPI: {
      searchPlaces:      (query)              => api.get('/api/v1/locations/search', { params: { query } }),
      geocode:           (address)            => api.get('/api/v1/locations/geocode', { params: { address } }),
      reverseGeocode:    (lat, lng)           => api.get('/api/v1/locations/reverse-geocode', { params: { lat, lng } }),
      getDirections:     (origin, destination)=> api.post('/api/v1/locations/directions', { origin, destination }),
      calculateDistance: (data)               => api.post('/api/v1/locations/distance', data),
      getETA:            (data)               => api.post('/api/v1/locations/eta', data),
    },
    notificationAPI: {
      getNotifications:    (params) => api.get('/api/v1/notifications', { params }),
      markAsRead:          (id)     => api.put(`/api/v1/notifications/${id}/read`),
      markAllAsRead:       ()       => api.put('/api/v1/notifications/read-all'),
      deleteNotification:  (id)     => api.delete(`/api/v1/notifications/${id}`),
      updatePreferences:   (data)   => api.put('/api/v1/notifications/preferences', data),
    }
  };
}

// ─── Instance Axios par défaut ────────────────────────────────────────────────
const defaultApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Intercepteur requête : attacher JWT
defaultApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur réponse : refresh automatique si 401
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

// ─── Exports ──────────────────────────────────────────────────────────────────
const services = createApiServices(defaultApi);

export const api             = defaultApi;
export const authAPI         = services.authAPI;
export const userAPI         = services.userAPI;
export const driverAPI       = services.driverAPI;
export const rideAPI         = services.rideAPI;
export const paymentAPI      = services.paymentAPI;
export const adminAPI        = services.adminAPI;
export const reviewAPI       = services.reviewAPI;
export const locationAPI     = services.locationAPI;
export const notificationAPI = services.notificationAPI;
export { createApiServices };