import axios from 'axios';

// ─── URL Backend ──────────────────────────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://backend-a9ve.onrender.com';

console.log('[TaxiLibre Admin] API URL:', API_BASE_URL);

// ─── Instance Axios ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Intercepteur requête : JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur réponse : refresh 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const res = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, { refreshToken });
          const { accessToken } = res.data.data.tokens;
          localStorage.setItem('accessToken', accessToken);
          original.headers.Authorization = `Bearer ${accessToken}`;
          return api(original);
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

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authAPI = {
  login:          (credentials) => api.post('/api/v1/auth/login', credentials),
  register:       (data)        => api.post('/api/v1/auth/register', data),
  getProfile:     ()            => api.get('/api/v1/auth/profile'),
  updateProfile:  (data)        => api.put('/api/v1/auth/profile', data),
  changePassword: (data)        => api.put('/api/v1/auth/change-password', data),
  logout:         (data)        => api.post('/api/v1/auth/logout', data),
  refreshToken:   (data)        => api.post('/api/v1/auth/refresh', data),
};

// ─── Admin API ────────────────────────────────────────────────────────────────
export const adminAPI = {
  getDashboard:        ()             => api.get('/api/v1/admin/dashboard'),
  getDrivers:          ()             => api.get('/api/v1/admin/drivers'),
  getDriverDetails:    (id)           => api.get(`/api/v1/admin/drivers/${id}`),
  updateDriverStatus:  (id, status)   => api.put(`/api/v1/admin/drivers/${id}/status`, status),
  suspendDriver:       (id, reason)   => api.post(`/api/v1/admin/drivers/${id}/suspend`, { reason }),
  deleteDriver:        (id)           => api.delete(`/api/v1/admin/drivers/${id}`),
  getRides:            (params)       => api.get('/api/v1/admin/rides', { params }),
  getRideDetails:      (id)           => api.get(`/api/v1/admin/rides/${id}`),
  updateRideStatus:    (id, status)   => api.put(`/api/v1/admin/rides/${id}/status`, { status }),
  getUsers:            (params)       => api.get('/api/v1/admin/users', { params }),
  getUserDetails:      (id)           => api.get(`/api/v1/admin/users/${id}`),
  updateUserStatus:    (id, isActive) => api.put(`/api/v1/admin/users/${id}/status`, { isActive }),
  deleteUser:          (id)           => api.delete(`/api/v1/admin/users/${id}`),
  getRevenue:          (params)       => api.get('/api/v1/admin/revenue', { params }),
  getSupportTickets:   (params)       => api.get('/api/v1/admin/support', { params }),
  updateSupportTicket: (id, data)     => api.put(`/api/v1/admin/support/${id}`, data),
  getSettings:         ()             => api.get('/api/v1/admin/settings'),
  updateSettings:      (data)         => api.put('/api/v1/admin/settings', data),
};

export default api;