import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { rideAPI } from '../services/api';
import { MapPinIcon, ClockIcon, CreditCardIcon, StarIcon, RefreshCwIcon } from '@heroicons/react/24/outline';

export default function RideTracking() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { connected } = useSocket();
  const [rideData, setRideData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRideData();
  }, [rideId]);

  const fetchRideData = async () => {
    if (!rideId) {
      setError('ID de trajet non spécifié');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await rideAPI.getRideById(rideId);
      if (response.data.success) {
        setRideData(response.data.ride);
      } else {
        setError('Erreur lors de la récupération des données du trajet');
      }
    } catch (err) {
      setError('Erreur de connexion. Veuillez réessayer plus tard.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <>
        <a href="#main-content" className="absolute left-0 top-0 px-3 py-2 bg-blue-600 text-white transform -translate-y-4 transition-transform duration-200 focus:translate-y-0 z-50">
          Passer au contenu principal
        </a>
        <main id="main-content" className="min-h-screen bg-gray-100 p-8">
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
              </div>
              <p className="text-lg text-gray-600">Chargement des détails du trajet...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <a href="#main-content" className="absolute left-0 top-0 px-3 py-2 bg-blue-600 text-white transform -translate-y-4 transition-transform duration-200 focus:translate-y-0 z-50">
          Passer au contenu principal
        </a>
        <main id="main-content" className="min-h-screen bg-gray-100 p-8">
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6" role="alert">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M7 20a10.011 10.011 0 018.793-7.998A33.923 33.923 0 0112 15c-4.061 0-7.747 2.572-9.543 6.098A10.012 10.012 0 017 20z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Erreur</h3>
                <p className="mt-1 text-sm text-gray-700">{error}</p>
                <button 
                  onClick={() => {
                    if (window.history.length > 1) {
                      window.history.back();
                    } else {
                      navigate('/dashboard');
                    }
                  }}
                  className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Retour
                </button>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!rideData) {
    return null; // This shouldn't happen, but just in case
  }

  return (
    <>
      <a href="#main-content" className="absolute left-0 top-0 px-3 py-2 bg-blue-600 text-white transform -translate-y-4 transition-transform duration-200 focus:translate-y-0 z-50">
        Passer au contenu principal
      </a>
      <main id="main-content" className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2" id="ride-tracking-heading">
              Suivi du trajet #{rideId?.slice(0, 8)}
            </h1>
            <p className="text-sm text-gray-500" id="ride-status">
              Statut : {rideData.status.replace('_', ' ').toUpperCase()}
            </p>
          </div>

          {/* Main Content */}
          <div className="space-y-6">
            {/* Driver Information */}
            <section aria-labelledby="driver-info-heading" className="bg-blue-50 p-4 rounded-lg">
              <h3 id="driver-info-heading" className="font-semibold mb-2">Informations sur le conducteur</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Nom :</span> {rideData.driver?.name || 'Conducteur attribué prochainement'}</p>
                <p><span className="font-medium">Évaluation :</span>
                  <span role="img" aria-label="Étoile de notation">
                    {'⭐'.repeat(Math.floor(rideData.driver?.rating || 0))}
                    {rideData.driver?.rating % 1 >= 0.5 ? '½' : ''}
                  </span>
                  <span className="ml-1 text-xs">({rideData.driver?.rating || 0}/5)</span>
                  <span className="text-xs ml-1">({rideData.driver?.totalRides || 0} courses)</span>
                </p>
                <p><span className="font-medium">Véhicule :</span> {rideData.driver?.vehicle || 'À confirmer'}</p>
                <p><span className="font-medium">Plaque :</span> {rideData.driver?.licensePlate || 'À confirmer'}</p>
              </div>
            </section>

            {/* Map Section */}
            <section aria-labelledby="map-heading" className="bg-gray-100 h-96 rounded-lg relative">
              <h3 id="map-heading" className="sr-only">Carte du trajet en temps réel</h3>
              <div className="absolute inset-0">
                {/* In a real app, this would be the actual map */}
                <div className="h-full w-full flex items-center justify-center">
                  <p className="text-gray-600">Carte en cours de chargement...</p>
                </div>
              </div>
              {!connected && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-openness-90">
                  <div className="text-center">
                    <p className="font-semibold text-red-600">Déconnecté</p>
                    <p className="text-sm text-gray-600">Tentative de reconnexion...</p>
                  </div>
                </div>
              )}
            </section>

            {/* Ride Details */}
            <section aria-labelledby="ride-details-heading" className="bg-yellow-50 p-4 rounded-lg">
              <h3 id="ride-details-heading" className="font-semibold mb-2">Détails du trajet</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Départ :</span> {rideData.pickupAddress}
                  </div>
                  <div>
                    <span className="font-medium">Arrivée :</span> {rideData.dropoffAddress}
                  </div>
                  <div>
                    <span className="font-medium">Heure de départ :</span> {formatDate(rideData.startTime || rideData.createdAt)}
                  </div>
                  <div>
                    <span className="font-medium">Heure estimée d'arrivée :</span> {formatDate(rideData.estimatedArrivalTime)}
                  </div>
                  <div>
                    <span className="font-medium">Tarif estimé :</span> {rideData.estimatedPrice ? `${rideData.estimatedPrice.toFixed(2)}€` : 'À déterminer'}
                  </div>
                  <div>
                    <span className="font-medium">Distance :</span> {rideData.distance ? `${rideData.distance.toFixed(1)} km` : 'En calcul...'}
                  </div>
                </div>
              </div>
            </section>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    navigate('/dashboard');
                  }
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Retour au tableau de bord
              </button>
              {rideData.status === 'completed' && (
                <button
                  onClick={() => navigate(`/rate-ride/${rideId}`)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Noter ce trajet
                  <StarIcon className="ml-2 w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}