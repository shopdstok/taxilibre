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