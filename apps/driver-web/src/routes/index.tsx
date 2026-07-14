import { RouteObject } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <ProtectedRoute><Outlet /></ProtectedRoute>,
    children: [
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'profile', element: <DriverProfilePage /> },
      { path: 'documents', element: <DriverDocumentsPage /> },
      { path: 'vehicle', element: <VehiclePage /> },
      { path: 'vehicle-documents', element: <VehicleDocumentsPage /> },
      { path: 'ride-requests', element: <RideRequestsPage /> },
      { path: 'active-ride/:rideId', element: <ActiveRidePage /> },
      { path: 'ride-history', element: <RideHistoryPage /> },
      { path: 'earnings', element: <EarningsPage /> },
      { path: 'wallet', element: <WalletPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'messages', element: <MessagesPage /> },
      { path: 'availability', element: <AvailabilityPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'support', element: <SupportPage /> },
      { path: 'faq', element: <FAQPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'cookies', element: <CookiesPage /> },
      { path: 'contact', element: <ContactPage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '*', element: <NotFoundPage /> },
]

// Lazy load pages to reduce initial bundle
const DashboardPage = React.lazy(() => import('@/pages/Dashboard'))
const DriverProfilePage = React.lazy(() => import('@/pages/DriverProfile'))
const DriverDocumentsPage = React.lazy(() => import('@/pages/DriverDocuments'))
const VehiclePage = React.lazy(() => import('@/pages/Vehicle'))
const VehicleDocumentsPage = React.lazy(() => import('@/pages/VehicleDocuments'))
const RideRequestsPage = React.lazy(() => import('@/pages/RideRequests'))
const ActiveRidePage = React.lazy(() => import('@/pages/ActiveRide'))
const RideHistoryPage = React.lazy(() => import('@/pages/RideHistory'))
const EarningsPage = React.lazy(() => import('@/pages/Earnings'))
const WalletPage = React.lazy(() => import('@/pages/Wallet'))
const TransactionsPage = React.lazy(() => import('@/pages/Transactions'))
const NotificationsPage = React.lazy(() => import('@/pages/Notifications'))
const MessagesPage = React.lazy(() => import('@/pages/Messages'))
const AvailabilityPage = React.lazy(() => import('@/pages/Availability'))
const SettingsPage = React.lazy(() => import('@/pages/Settings'))
const SupportPage = React.lazy(() => import('@/pages/Support'))
const FAQPage = React.lazy(() => import('@/pages/FAQ'))
const PrivacyPage = React.lazy(() => import('@/pages/Privacy'))
const TermsPage = React.lazy(() => import('@/pages/Terms'))
const CookiesPage = React.lazy(() => import('@/pages/Cookies'))
const ContactPage = React.lazy(() => import('@/pages/Contact'))
const LoginPage = React.lazy(() => import('@/pages/Login'))
const RegisterPage = React.lazy(() => import('@/pages/Register'))
const ForgotPasswordPage = React.lazy(() => import('@/pages/ForgotPassword'))
const NotFoundPage = React.lazy(() => import('@/pages/NotFound'))
