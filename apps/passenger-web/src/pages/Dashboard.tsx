import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
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
      <div className="flex items-center justify-center min-h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {user?.firstName}! 👋
        </h1>
        <p className="text-blue-100">
          {connected ? 'You\'re connected and ready to ride!' : 'Connecting to ride service...'}
        </p>
      </div>

      {/* Active Ride */}
      {activeRide ? (
        <div className="card p-6 border-l-4 border-blue-500">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Active Ride</h2>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(activeRide.status)}`}>
                {activeRide.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <Link
              to={`/ride-tracking/${activeRide.id}`}
              className="btn-primary text-sm"
            >
              Track Ride
            </Link>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <MapPinIcon className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Pickup</p>
                <p className="font-medium">{activeRide.pickupAddress}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <MapPinIcon className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Dropoff</p>
                <p className="font-medium">{activeRide.dropoffAddress}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <ClockIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {formatDate(activeRide.createdAt)}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <CreditCardIcon className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{formatPrice(activeRide.estimatedPrice)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Quick Actions */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/book-ride"
            className="card p-6 hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <MapPinIcon className="w-6 h-6 text-blue-600" />
              </div>
              <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Book a Ride</h3>
            <p className="text-gray-600 text-sm">Request a ride to your destination</p>
          </Link>

          <Link
            to="/ride-history"
            className="card p-6 hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <ClockIcon className="w-6 h-6 text-green-600" />
              </div>
              <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ride History</h3>
            <p className="text-gray-600 text-sm">View your past rides and receipts</p>
          </Link>

          <Link
            to="/payment"
            className="card p-6 hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <CreditCardIcon className="w-6 h-6 text-purple-600" />
              </div>
              <ArrowRightIcon className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Methods</h3>
            <p className="text-gray-600 text-sm">Manage your payment options</p>
          </Link>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {stats.totalRides || 0}
            </div>
            <div className="text-sm text-gray-600">Total Rides</div>
          </div>

          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {formatPrice(stats.totalSpent || 0)}
            </div>
            <div className="text-sm text-gray-600">Total Spent</div>
          </div>

          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Your Rating</div>
          </div>

          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {stats.distanceTraveled ? `${stats.distanceTraveled}km` : '0km'}
            </div>
            <div className="text-sm text-gray-600">Distance Traveled</div>
          </div>
        </div>
      )}

      {/* Recent Rides */}
      {recentRides.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Rides</h2>
            <Link
              to="/ride-history"
              className="text-blue-600 hover:text-blue-500 text-sm font-medium"
            >
              View All
            </Link>
          </div>

          <div className="space-y-4">
            {recentRides.map((ride) => (
              <div key={ride.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ride.status)}`}>
                      {ride.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">
                      {formatDate(ride.createdAt)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="text-gray-600">From:</span> {ride.pickupAddress}
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-600">To:</span> {ride.dropoffAddress}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-medium">{formatPrice(ride.totalPrice || ride.estimatedPrice)}</div>
                  {ride.driver && (
                    <div className="flex items-center space-x-1 mt-1">
                      <StarIcon className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-gray-600">{ride.driver.rating}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
          <Link
            to="/notifications"
            className="text-blue-600 hover:text-blue-500 text-sm font-medium"
          >
            View All
          </Link>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <BellIcon className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Welcome to TaxiLibre!</p>
              <p className="text-xs text-gray-600">Your account is ready to book rides</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">First ride discount</p>
              <p className="text-xs text-gray-600">Get 20% off your first ride with code: FIRST20</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
