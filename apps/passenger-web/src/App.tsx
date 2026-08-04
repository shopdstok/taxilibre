import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { SocketProvider } from './contexts/SocketContext';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Spinner from './components/Spinner';

// Pages with lazy loading
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const BookRide = lazy(() => import('./pages/BookRide'));
const RideTracking = lazy(() => import('./pages/RideTracking'));
const RideHistory = lazy(() => import('./pages/RideHistory'));
const Payment = lazy(() => import('./pages/Payment'));
const Profile = lazy(() => import('./pages/Profile'));
const Notifications = lazy(() => import('./pages/Notifications'));
// New static pages
const Help = lazy(() => import('./pages/Help'));
const Contact = lazy(() => import('./pages/Contact'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Cookies = lazy(() => import('./pages/Cookies'));
const PaymentMethods = lazy(() => import('./pages/PaymentMethods'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <Router basename="/">
            <Layout>
              <Suspense fallback={<Spinner />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Static pages */}
                  <Route path="/help" element={<Help />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/cookies" element={<Cookies />} />
                  {/* Payment methods page */}
                  <Route path="/payment" element={<PaymentMethods />} />

                  {/* Protected routes */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/book-ride" element={
                    <ProtectedRoute>
                      <BookRide />
                    </ProtectedRoute>
                  } />
                  <Route path="/ride-tracking/:rideId" element={
                    <ProtectedRoute>
                      <RideTracking />
                    </ProtectedRoute>
                  } />
                  <Route path="/ride-history" element={
                    <ProtectedRoute>
                      <RideHistory />
                    </ProtectedRoute
                  } />
                  <Route path="/payment/:rideId" element={
                    <ProtectedRoute>
                      <Payment />
                    </ProtectedRoute
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute
                  } />
                  <Route path="/notifications" element={
                    <ProtectedRoute>
                      <Notifications />
                    </ProtectedRoute
                  } />
                </Routes>
              </Suspense>
            </Layout>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </Router>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;