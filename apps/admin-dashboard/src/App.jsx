import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Drivers from './pages/Drivers';
import Rides from './pages/Rides';
import Users from './pages/Users';
import Revenue from './pages/Revenue';
import Support from './pages/Support';
import Settings from './pages/Settings';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuthStore } from './stores/authStore';

function App() {
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <Router basename="/">
      <Toaster position="top-center" />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/drivers"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Drivers />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/rides"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Rides />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/users"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Users />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/revenue"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Revenue />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/support"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Support />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/settings"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Settings />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
