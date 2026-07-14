import React from 'react';

export default function Rides() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Ride Management</h1>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Ride ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Passenger</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Driver</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((ride) => (
                <tr key={ride} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">#{ride}</td>
                  <td className="px-6 py-4">Passenger {ride}</td>
                  <td className="px-6 py-4">Driver {ride}</td>
                  <td className="px-6 py-4">
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                      Completed
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold">€{(15 + ride * 5).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
