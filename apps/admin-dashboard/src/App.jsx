import React, { useEffect } from 'react';
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
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuthStore } from './stores/authStore';

function App() {
  const { isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Afficher un loader pendant la vérification initiale de l'\''auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 font-medium">Authentification en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-center" />
      <Routes>
        {/* Route publique */}
        <Route path="/login" element={<Login />} />

        {/* Routes protégées */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/drivers"   element={<ProtectedRoute><Drivers /></ProtectedRoute>} />
        <Route path="/rides"     element={<ProtectedRoute><Rides /></ProtectedRoute>} />
        <Route path="/users"     element={<ProtectedRoute><Users /></ProtectedRoute>} />
        <Route path="/revenue"   element={<ProtectedRoute><Revenue /></ProtectedRoute>} />
        <Route path="/support"   element={<ProtectedRoute><Support /></ProtectedRoute>} />
        <Route path="/settings"  element={<ProtectedRoute><Settings /></ProtectedRoute>} />

        {/* Redirection racine et page 404 */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;