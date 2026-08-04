import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BookRide = () => {
  const navigate = useNavigate();
  const [pickup, setPickup] = useState<string>('');
  const [dropoff, setDropoff] = useState<string>('');

  return (
    <>
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="absolute left-0 top-0 px-3 py-2 bg-blue-600 text-white transform -translate-y-4 transition-transform duration-200 focus:translate-y-0 z-50"
      >
        Passer au contenu principal
      </a>

      <main id="main-content" className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Réserver un trajet</h1>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="pickup-location" className="block text-sm font-medium text-gray-700 mb-2">
                  Lieu de prise en charge
                </label>
                <input
                  id="pickup-location"
                  type="text"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  aria-label="Lieu de prise en charge"
                  aria-required="true"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Entrez le lieu de prise en charge"
                />
              </div>

              <div>
                <label htmlFor="dropoff-location" className="block text-sm font-medium text-gray-700 mb-2">
                  Lieu de dépose
                </label>
                <input
                  id="dropoff-location"
                  type="text"
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                  aria-label="Lieu de dépose"
                  aria-required="true"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Entrez le lieu de dépose"
                />
              </div>

              <button
                onClick={() => navigate('/rides')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Rechercher des trajets
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default BookRide;