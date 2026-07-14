import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { adminAPI } from '../services/api.js';

export default function Drivers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: drivers = [], isLoading, isError, error } = useQuery('drivers', adminAPI.getDrivers, {
    // Optionally pass filters as query params
    // For now we fetch all and filter client-side
  });

  // Mutation for updating driver status (activate/deactivate)
  const updateStatusMutation = useMutation(
    ({ driverId, status }) => adminAPI.updateDriverStatus(driverId, { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('drivers');
        queryClient.invalidateQueries('dashboard'); // dashboard may need update
      },
      onError: (err) => {
        alert(`Failed to update driver status: ${err.message}`);
      }
    }
  );

  // Mutation for suspending driver
  const suspendMutation = useMutation(
    ({ driverId, reason }) => adminAPI.suspendDriver(driverId, { reason }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('drivers');
        queryClient.invalidateQueries('dashboard');
      },
      onError: (err) => {
        alert(`Failed to suspend driver: ${err.message}`);
      }
    }
  );

  // Mutation for deleting driver (if endpoint exists)
  const deleteMutation = useMutation(
    (driverId) => adminAPI.deleteDriver ? adminAPI.deleteDriver(driverId) : Promise.reject(new Error('Delete not implemented')),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('drivers');
        queryClient.invalidateQueries('dashboard');
      },
      onError: (err) => {
        alert(`Failed to delete driver: ${err.message}`);
      }
    }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="flex items-center justify-content h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading drivers...</p>
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

  // Filter drivers
  const filteredDrivers = drivers.filter((driver) => {
    const matchesSearch = driver.name?.toLowerCase().includes(search.toLowerCase()) ||
      driver.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || driver.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = (driverId, status) => {
    updateStatusMutation.mutate({ driverId, status });
  };

  const handleSuspend = (driverId) => {
    const reason = window.prompt('Please enter reason for suspension:');
    if (reason) {
      suspendMutation.mutate({ driverId, reason });
    }
  };

  const handleDelete = (driverId) => {
    if (window.confirm('Are you sure you want to delete this driver? This action cannot be undone.')) {
      deleteMutation.mutate(driverId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Driver Management</h1>
        
        {/* Search and filter controls */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="Search drivers by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
            }}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Reset
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Rating</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Documents</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colspan="6" className="px-6 py-4 text-center text-gray-500">
                    No drivers found
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((driver) => (
                  <tr key={driver.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">{driver.name || 'N/A'}</td>
                    <td className="px-6 py-4">{driver.email || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        driver.status === 'active' ? 'bg-green-100 text-green-700' :
                        driver.status === 'inactive' ? 'bg-yellow-100 text-yellow-700' :
                        driver.status === 'suspended' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {driver.status?.charAt(0).toUpperCase() + driver.status?.slice(1) || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      ⭐ {(driver.rating ?? 0).toFixed(1)}
                    </td>
                    <td className="px-6 py-4">
                      {driver.documents?.length > 0 ? (
                        <span className="text-green-600">{driver.documents.length} uploaded</span>
                      ) : (
                        <span className="text-red-600">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleUpdateStatus(driverId, driver.status === '
