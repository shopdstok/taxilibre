import React from 'react';
import { useParams } from 'react-router-dom';

export default function RideTracking() {
  const { rideId } = useParams();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold mb-6">Tracking Ride #{rideId?.slice(0, 8)}</h1>
        
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Driver Information</h3>
            <p>Name: John Doe</p>
            <p>Rating: ⭐ 4.8 (250 rides)</p>
            <p>Vehicle: Toyota Corolla - TL-001</p>
          </div>

          <div className="bg-gray-100 h-96 rounded-lg flex items-center justify-center">
            <p className="text-gray-600">Map will appear here</p>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Ride Details</h3>
            <p>From: 123 Main Street, NYC</p>
            <p>To: Grand Central Station, NYC</p>
            <p>Estimated Fare: €24.50</p>
            <p>ETA: 5 minutes</p>
          </div>
        </div>
      </div>
    </div>
  );
}
