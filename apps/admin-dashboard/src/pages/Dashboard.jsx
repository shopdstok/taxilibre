import React from 'react';
import { useQuery } from 'react-query';
import { adminAPI } from '../services/api.js';

export default function Dashboard() {
  const { data, isLoading, isError, error } = useQuery('dashboard', adminAPI.getDashboard, {
    refetchInterval: 30000, // refetch every 30 seconds for real-time updates
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="flex items-center justify-content h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline">{error.message}</span>
        </div>
      </div>
    );
  }

  // Assuming data structure:
  // {
  //   totalUsers: number,
  //   totalDrivers: number,
  //   totalRides: number,
  //   totalRevenue: number,
  //   pendingApprovals: Array<{ id, name, ... }>,
  //   recentRides: Array<{ id, passengerName, driverName, status, amount }>
  // }
  const {
    totalUsers = 0,
    totalDrivers = 0,
    totalRides = 0,
    totalRevenue = 0,
    pendingApprovals = [],
    recentRides = []
  } = data || {};

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 text-sm font-semibold">Total Users</h3>
            <p className="text-3xl font-bold mt-2">{totalUsers.toLocaleString()}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 text-sm font-semibold">Total Drivers</h3>
            <p className="text-3xl font-bold mt-2">{totalDrivers.toLocaleString()}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 text-sm font-semibold">Total Rides</h3>
            <p className="text-3xl font-bold mt-2">{totalRides.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 text-sm font-semibold">Total Revenue</h3>
            <p className="text-3xl font-bold mt-2">€{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-4">Pending Driver Approvals</h2>
            {pendingApprovals.length === 0 ? (
              <p className="text-gray-500">No pending approvals</p>
            ) : (
              <div className="space-y-3">
                {pendingApprovals.map((driver) => (
                  <div key={driver.id} className="flex justify-between items-center border-b pb-3">
                    <div>
                      <p className="font-semibold">{driver.name || `Driver #${driver.id}`}</p>
                      <p className="text-sm text-gray-600">Pending verification</p>
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={() => approveDriver(driver.id)}
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-opacity-90 hover:bg-green-700 rounded"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectDriver(driver.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-4">Recent Rides</h2>
            {recentRides.length === 0 ? (
              <p className="text-gray-500">No recent rides</p>
            ) : (
              <div className="space-y-3">
                {recentRides.map((ride) => (
                  <div key={ride.id} className="flex justify-between items-center border-b pb-3">
                    <div>
                      <p className="font-semibold">Ride #{ride.id}</p>
                      <p className="text-sm text-gray-600">{ride.status}</p>
                    </div>
                    <p className="font-semibold">€{ride.amount?.toFixed(2) ?? '0.00'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Placeholder functions for approve/reject.
 * In a real implementation, these would call API endpoints to update driver status.
 */
async function approveDriver(driverId) {
  try {
    // Assuming there is an endpoint to approve driver (update status to active)
    await adminAPI.updateDriverStatus(driverId, { status: 'active' });
    // Refetch dashboard data to update counts
    // In a real app, we would use queryClient.invalidateQueries('dashboard');
    alert('Driver approved');
  } catch (err) {
    alert(`Failed to approve driver: ${err.message}`);
  }
}

async function rejectDriver(driverId) {
  try {
    // Assuming reject sets status to rejected or inactive
    await adminAPI.updateDriverStatus(driverId, { status: 'rejected' });
    alert('Driver rejected');
  } catch (err) {
    alert(`Failed to reject driver: ${err.message}`);
  }
}
