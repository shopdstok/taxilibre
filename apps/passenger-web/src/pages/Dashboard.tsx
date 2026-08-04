import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { userAPI, rideAPI } from '../services/api';
import {
  MapPinIcon,
  ClockIcon,
  CreditCardIcon,
  StarIcon,
  ArrowRightIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { Spinner } from '../components/Spinner';

// Define types for our data structures
interface User {
  id: string;
  firstName: string;
  lastName: string;
  // Add other user properties as needed
}

interface Ride {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  estimatedPrice: number;
  totalPrice?: number;
  createdAt: string;
  driver?: {
    rating: number;
    // Add other driver properties as needed
  };
  // Add other ride properties as needed
}

interface Statistics {
  totalRides: number;
  totalSpent: number;
  averageRating: number;
  distanceTraveled: number;
  // Add other statistics properties as needed
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  // Add other API response properties as needed
}

const Dashboard = () => {
  const { user } = useAuth();
  const { connected } = useSocket();
  const location = useLocation();
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [recentRides, setRecentRides] = useState<Ride[]>([]);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load active ride
      const activeRideResponse = await rideAPI.getActiveRide();
      if (activeRideResponse.data.success) {
        setActiveRide(activeRideResponse.data.ride);
      }

      // Load recent rides
      const ridesResponse = await userAPI.getRideHistory({ limit: 3 });
      if (ridesResponse.data.success) {
        setRecentRides(ridesResponse.data.rides);
      }

      // Load user statistics
      const statsResponse = await userAPI.getStatistics();
      if (statsResponse.data.success) {
        setStats(statsResponse.data.statistics);
      }
    } catch (error) {
      // Error handled by loading state and UI - could add toast notification if desired
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      requested: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      driver_arriving: 'bg-purple-100 text-purple-800',
      in_progress: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64" aria-live="polite" aria-label="Chargement">
        <Spinner size="lg" />
        <span className="sr-only">Chargement des données du tableau de bord...</span>
      </div>
    );
  }

  return (
    <>
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="absolute left-0 top-0 px-3 py-2 bg-blue-600 text-white transform -translate-y-4 transition-transform duration-200 focus:translate-y-0 z-50"
      >
        Passer au contenu principal
      </a>

      <main id="main-content">
        {/* Welcome Section */}
        <section aria-labelledby="welcome-heading" className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <h2 id="welcome-heading" className="text-2xl font-bold mb-2">
            Bienvenue, {user?.firstName} ! 👋
          </h2>
          <p className="text-blue-100">
            {connected
              ? 'Vous êtes connecté et prêt à réserver un trajet !'
              : 'Connexion au service de trajet en cours...'}
          </p>
        </section>

        {/* Active Ride Section */}
        {activeRide ? (
          <section aria-labelledby="active-ride-heading" className="card p-6 border-l-4 border-blue-500">
            <h3 id="active-ride-heading" className="text-xl font-semibold text-gray-900 mb-2">
              Trajet actif
            </h3>
            <div className="flex items-start justify-between mb-4">
              <div>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                    activeRide.status
                  )}`}
                  aria-live="polite"
                >
                  {activeRide.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <Link
                to={`/ride-tracking/${activeRide.id}`}
                className="btn-primary text-sm"
                aria-label={`Suivre le trajet actif ${activeRide.id}`}
              >
                Suivre le trajet
                <ArrowRightIcon className="w-4 h-4 ml-2" aria-hidden="true" />
              </Link>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPinIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                <div>
                  <p className="text-sm text-gray-600">Lieu de prise en charge</p>
                  <p className="font-medium">{activeRide.pickupAddress}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <MapPinIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                <div>
                  <p className="text-sm text-gray-600">Lieu de dépose</p>
                  <p className="font-medium">{activeRide.dropoffAddress}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <ClockIcon className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    <span className="text-sm text-gray-600">
                      {formatDate(activeRide.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CreditCardIcon className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    <span className="font-medium">{formatPrice(activeRide.estimatedPrice)}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          /* Quick Actions */
          <section aria-labelledby="quick-actions-heading" className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <h2 id="quick-actions-heading" className="sr-only">Actions rapides</h2>
            <Link
              to="/book-ride"
              className="card p-6 hover:shadow-lg transition-shadow group"
              aria-label="Réserver un nouveau trajet"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <MapPinIcon className="w-6 h-6 text-blue-600" aria-hidden="true" />
                </div>
                <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Réserver un trajet</h3>
              <p className="text-gray-600 text-sm">Demandez un trajet vers votre destination</p>
            </Link>

            <Link
              to="/ride-history"
              className="card p-6 hover:shadow-lg transition-shadow group"
              aria-label="Voir l'historique des trajets"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <ClockIcon className="w-6 h-6 text-green-600" aria-hidden="true" />
                </div>
                <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Historique des trajets</h3>
              <p className="text-gray-600 text-sm">Consultez vos trajets passés et leurs reçus</p>
            </Link>

            <Link
              to="/payment"
              className="card p-6 hover:shadow-lg transition-shadow group"
              aria-label="Gérer les méthodes de paiement"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <CreditCardIcon className="w-6 h-6 text-purple-600" aria-hidden="true" />
                </div>
                <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Méthodes de paiement</h3>
              <p className="text-gray-600 text-sm">Gérez vos options de paiement</p>
            </Link>
          </section>
        )}

        {/* Statistics Section */}
        {stats && (
          <section aria-labelledby="statistics-heading" className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <h2 id="statistics-heading" className="sr-only">Statistiques utilisateur</h2>
            <div className="card p-4 text-center" aria-labelledby="total-rides-label">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {stats.totalRides || 0}
              </div>
              <div id="total-rides-label" className="text-sm text-gray-600">
                Total des trajets
              </div>
            </div>

            <div className="card p-4 text-center" aria-labelledby="total-spent-label">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {formatPrice(stats.totalSpent || 0)}
              </div>
              <div id="total-spent-label" className="text-sm text-gray-600">
                Total dépensé
              </div>
            </div>

            <div className="card p-4 text-center" aria-labelledby="average-rating-label">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
              </div>
              <div id="average-rating-label" className="text-sm text-gray-600">
                Votre note moyenne
              </div>
            </div>

            <div className="card p-4 text-center" aria-labelledby="distance-traveled-label">
              <div className="text-2xl font-bold text-orange-600 mb-1">
                {stats.distanceTraveled ? `${stats.distanceTraveled}km` : '0km'}
              </div>
              <div id="distance-traveled-label" className="text-sm text-gray-600">
                Distance parcourue
              </div>
            </div>
          </section>
        )}

        {/* Recent Rides Section */}
        {recentRides.length > 0 && (
          <section aria-labelledby="recent-rides-heading" className="card p-6">
            <h2 id="recent-rides-heading" className="text-xl font-semibold text-gray-900 mb-6">
              Derniers trajets
            </h2>
            <div className="flex items-center justify-between mb-4">
              <Link
                to="/ride-history"
                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                aria-label="Voir tous les trajets"
              >
                Tout voir
                <ArrowRightIcon className="w-4 h-4 ml-2" aria-hidden="true" />
              </Link>
            </div>

            <div className="space-y-4">
              {recentRides.map((ride, index) => (
                <div
                  key={`${ride.id}-${index}`}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  role="region"
                  aria-labelledby={`recent-ride-title-${index}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          ride.status
                        )}`}
                        aria-live="polite"
                      >
                        {ride.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-600">
                        {formatDate(ride.createdAt)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm">
                        <span className="text-gray-600">Départ :</span> {ride.pickupAddress}
                      </p>
                      <p className="text-sm">
                        <span className="text-gray-600">Arrivée :</span> {ride.dropoffAddress}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-medium">{formatPrice(ride.totalPrice || ride.estimatedPrice)}</div>
                    {ride.driver && (
                      <div className="flex items-center space-x-1 mt-1" role="group" aria-label="Évaluation du chauffeur">
                        <StarIcon className="w-4 h-4 text-yellow-400" aria-hidden="true" />
                        <span className="text-sm text-gray-600">{ride.driver.rating}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Notifications Section */}
        <section aria-labelledby="notifications-heading" className="card p-6">
          <h2 id="notifications-heading" className="text-xl font-semibold text-gray-900 mb-4">
            Notifications
          </h2>
          <div className="flex items-center justify-between mb-4">
            <Link
              to="/notifications"
              className="text-blue-600 hover:text-blue-500 text-sm font-medium"
              aria-label="Voir toutes les notifications"
            >
              Tout voir
              <ArrowRightIcon className="w-4 h-4 ml-2" aria-hidden="true" />
            </Link>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <BellIcon className="w-5 h-5 text-blue-600" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Bienvenue sur TaxiLibre !</p>
                <p className="text-xs text-gray-600">Votre compte est prêt pour réserver des trajets</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg" role="status" aria-live="polite">
              <div className="w-2 h-2 bg-green-500 rounded-full" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Réduction sur le premier trajet</p>
                <p className="text-xs text-gray-600">
                  Obtenez 20% de réduction sur votre premier trajet avec le code : FIRST20
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default Dashboard;