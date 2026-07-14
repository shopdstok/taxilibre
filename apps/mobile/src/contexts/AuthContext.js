import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check authentication on app start
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('taxilibre_token');
      const storedUser = await AsyncStorage.getItem('taxilibre_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
        
        // Verify token is still valid
        try {
          const response = await axios.get(`${API_BASE_URL}/auth/profile`);
          if (response.data.success) {
            setUser(response.data.user);
            await AsyncStorage.setItem('taxilibre_user', JSON.stringify(response.data.user));
          } else {
            await logout();
          }
        } catch (error) {
          await logout();
        }
      }
    } catch (error) {
      await logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password
      });

      if (response.data.success) {
        const { user: userData, token: newToken } = response.data;
        
        // Store in state
        setUser(userData);
        setToken(newToken);
        setIsAuthenticated(true);
        
        // Store in AsyncStorage
        await AsyncStorage.setItem('taxilibre_token', newToken);
        await AsyncStorage.setItem('taxilibre_user', JSON.stringify(userData));
        
        return { success: true };
      } else {
        return { 
          success: false, 
          error: response.data.message || 'Login failed' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Network error' 
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);

      if (response.data.success) {
        const { user: newUser, token: newToken } = response.data;
        
        // Store in state
        setUser(newUser);
        setToken(newToken);
        setIsAuthenticated(true);
        
        // Store in AsyncStorage
        await AsyncStorage.setItem('taxilibre_token', newToken);
        await AsyncStorage.setItem('taxilibre_user', JSON.stringify(newUser));
        
        return { success: true };
      } else {
        return { 
          success: false, 
          error: response.data.message || 'Registration failed' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Network error' 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint if token exists
      if (token) {
        await axios.post(`${API_BASE_URL}/auth/logout`);
      }
    } catch (error) {
    } finally {
      // Clear state
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      
      // Clear AsyncStorage
      await AsyncStorage.removeItem('taxilibre_token');
      await AsyncStorage.removeItem('taxilibre_user');
      
      // Clear axios headers
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/users/profile`, profileData);
      
      if (response.data.success) {
        const updatedUser = response.data.user;
        setUser(updatedUser);
        await AsyncStorage.setItem('taxilibre_user', JSON.stringify(updatedUser));
        
        return { success: true };
      } else {
        return { 
          success: false, 
          error: response.data.message || 'Update failed' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Network error' 
      };
    }
  };

  const refreshToken = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`);
      
      if (response.data.success) {
        const { token: newToken } = response.data;
        setToken(newToken);
        await AsyncStorage.setItem('taxilibre_token', newToken);
        
        return { success: true };
      } else {
        await logout();
        return { success: false };
      }
    } catch (error) {
      await logout();
      return { success: false };
    }
  };

  const value = {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    updateProfile,
    refreshToken,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
