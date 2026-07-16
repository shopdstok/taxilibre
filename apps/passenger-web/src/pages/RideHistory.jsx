import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const RideHistory = () => {
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - replace with API call
    const mockRides = [
      {
        id: 1,
        date: '2024-01-15',
        pickup: '123 Main St',
        dropoff: '456 Oak Ave',
        price: 15.50,
        status: 'completed'
      },
      {
        id: 2,
        date: '2024-01-14',
        pickup: '789 Pine St',
        dropoff: '321 Elm Rd',
        price: 22.00,
        status: 'completed'
      }
    ];
    
    setTimeout(() => {
      setRides(mockRides);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading ride history...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Ride History</h1>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {rides.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No rides found
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {rides.map((ride) => (
                <div key={ride.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">
                        {ride.pickup} → {ride.dropoff}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {ride.date}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        ${ride.price.toFixed(2)}
                      </div>
                      <div className="text-sm text-green-600 capitalize">
                        {ride.status}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <button
            onClick={() => navigate('/')}
            className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Book New Ride
          </button>
        </div>
      </div>
    </div>
  );
};

export default RideHistory;