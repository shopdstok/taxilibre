import axios from 'axios';
import createApiServices from 'shared/utils/apiClient';

// Create axios instance
const API_BASE_URL = import.meta.env?.VITE_API_URL || process.env?.VITE_API_URL || '/api';
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

// Create API service objects using the factory
const {
  authAPI,
  userAPI,
  driverAPI,
  rideAPI,
  paymentAPI,
  reviewAPI,
  locationAPI,
  notificationAPI,
} = createApiServices(api);

// Re-export from shared API client
export {
  api as default,
  authAPI,
  userAPI,
  rideAPI,
  paymentAPI,
  reviewAPI,
  locationAPI,
  notificationAPI,
};
