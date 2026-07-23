import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../services/api.js';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: adminAPI.getDashboard,
    refetchInterval: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: (driverId) => adminAPI.updateDriverStatus(driverId, { status: 'active' }),
    onSuccess: () => {
      toast.success('Chauffeur approuvé avec succès');
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
    onError: (err) => toast.error(`Échec approbation: ${err.message}`),
  });

  const rejectMutation = useMutation({
    mutationFn: (driverId) => adminAPI.updateDriverStatus(driverId, { status: 'rejected' }),
    onSuccess: () => {
      toast.success('Chauffeur rejeté');
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
    onError: (err) => toast.error(`Échec rejet: ${err.message}`),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-gray-600">Chargement du tableau de bord...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Erreur !</strong>
          <span className="block sm:inline"> {error.message}</span>
        </div>
      </div>
    );
  }

  const {
    totalUsers = 0,
    totalDrivers = 0,
    totalRides = 0,
    totalRevenue = 0,
    pendingApprovals = [],
    recentRides = [],
  } = data || {};

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Tableau de bord</h1>

        {/* Cartes statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 text-sm font-semibold">Utilisateurs</h3>
            <p className="text-3xl font-bold mt-2">{totalUsers.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 text-sm font-semibold">Chauffeurs</h3>
            <p className="text-3xl font-bold mt-2">{totalDrivers.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 text-sm font-semibold">Courses</h3>
            <p className="text-3xl font-bold mt-2">{totalRides.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 text-sm font-semibold">Revenus</h3>
            <p className="text-3xl font-bold mt-2">
              €{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Deux colonnes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Approbations en attente */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-4">Chauffeurs en attente</h2>
            {pendingApprovals.length === 0 ? (
              <p className="text-gray-500">Aucune approbation en attente</p>
            ) : (
              <div className="space-y-3">
                {pendingApprovals.map((driver) => (
                  <div key={driver.id} className="flex justify-between items-center border-b pb-3">
                    <div>
                      <p className="font-semibold">{driver.name || `Chauffeur #${driver.id}`}</p>
                      <p className="text-sm text-gray-600">En attente de vérification</p>
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={() => approveMutation.mutate(driver.id)}
                        disabled={approveMutation.isPending}
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                      >
                        Approuver
                      </button>
                      <button
                        onClick={() => rejectMutation.mutate(driver.id)}
                        disabled={rejectMutation.isPending}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                      >
                        Rejeter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Courses récentes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-4">Courses récentes</h2>
            {recentRides.length === 0 ? (
              <p className="text-gray-500">Aucune course récente</p>
            ) : (
              <div className="space-y-3">
                {recentRides.map((ride) => (
                  <div key={ride.id} className="flex justify-between items-center border-b pb-3">
                    <div>
                      <p className="font-semibold">Course #{ride.id}</p>
                      <p className="text-sm text-gray-600">{ride.status}</p>
                    </div>
                    <p className="font-semibold">€{(ride.amount ?? 0).toFixed(2)}</p>
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