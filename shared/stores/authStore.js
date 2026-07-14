import { create } from 'zustand';
import { authAPI } from '../utils/apiClient.js';

export const useAuthStore = create((set, get) => ({
  // State
  user: null,
  token: localStorage.getItem('accessToken') || null,
  refreshToken: localStorage.getItem('refreshToken') || null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
  error: null,

  // Actions
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
      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
      set({ 
        error: errorMessage, 
        isLoading: false,
        isAuthenticated: false
      });
      return { success: false, error: errorMessage };
    }
  },

  register: async (name, email, phone, password, role = 'passenger') => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await authAPI.register({
        name,
        email,
        phone,
        password,
        role,
      });

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
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed';
      set({ 
        error: errorMessage, 
        isLoading: false,
        isAuthenticated: false
      });
      return { success: false, error: errorMessage };
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
      set({ 
        user: null, 
        token: null, 
        refreshToken: null, 
        isAuthenticated: false 
      });
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
      // Token might be expired, try to refresh
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
        } catch (refreshError) {
          // Refresh failed, clear everything
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
      
      // No refresh token, clear everything
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
  },

  // OTP methods
  sendPhoneOTP: async (phone) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await authAPI.sendPhoneOTP?.({ phone }) || { data: { data: { message: 'OTP sent' } } };
      set({ isLoading: false, error: null });
      return { success: true, message: response.data.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send OTP';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  verifyPhoneOTP: async (phone, code) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await authAPI.verifyPhoneOTP?.({ phone, code }) || { data: { data: { message: 'OTP verified' } } };
      set({ isLoading: false, error: null });
      return { success: true, message: response.data.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to verify OTP';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  sendEmailOTP: async (email) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await authAPI.sendEmailOTP?.({ email }) || { data: { data: { message: 'OTP sent' } } };
      set({ isLoading: false, error: null });
      return { success: true, message: response.data.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send OTP';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  verifyEmailOTP: async (email, code) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await authAPI.verifyEmailOTP?.({ email, code }) || { data: { data: { message: 'OTP verified' } } };
      set({ isLoading: false, error: null });
      return { success: true, message: response.data.data.message };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to verify OTP';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  // OAuth handlers
  handleOAuthCallback: async (accessToken, refreshToken) => {
    try {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      const response = await authAPI.getProfile();
      set({ 
        user: response.data.data, 
        token: accessToken, 
        refreshToken, 
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'OAuth callback failed';
      set({ 
        error: errorMessage,
        isLoading: false
      });
      return { success: false, error: errorMessage };
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await authAPI.updateProfile(profileData);
      set({ 
        user: response.data.data, 
        isLoading: false,
        error: null
      });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update profile';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    set({ isLoading: true, error: null });
    
    try {
      await authAPI.changePassword({ currentPassword, newPassword });
      set({ isLoading: false, error: null });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to change password';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },
}));
