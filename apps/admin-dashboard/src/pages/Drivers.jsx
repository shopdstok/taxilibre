import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../services/api.js';

export default function Drivers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: drivers = [], isLoading, isError, error } = useQuery(
    'drivers',
    adminAPI.getDrivers,
    {
      // On pourrait passer des filtres en paramètres, mais on filtre côté client
    }
  );

  // Mutation pour activer/désactiver un chauffeur
  const updateStatusMutation = useMutation(
    ({ driverId, status }) => adminAPI.updateDriverStatus(driverId, { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('drivers');
        queryClient.invalidateQueries('dashboard');
      },
      onError: (err) => {
        alert(`Erreur lors de la mise à jour du statut : ${err.message}`);
      }
    }
  );

  // Mutation pour suspendre un chauffeur
  const suspendMutation = useMutation(
    ({ driverId, reason }) => adminAPI.suspendDriver(driverId, { reason }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('drivers');
        queryClient.invalidateQueries('dashboard');
      },
      onError: (err) => {
        alert(`Erreur lors de la suspension : ${err.message}`);
      }
    }
  );

  // Mutation pour supprimer un chauffeur (si l'API le permet)
  const deleteMutation = useMutation(
    (driverId) =>
      adminAPI.deleteDriver
        ? adminAPI.deleteDriver(driverId)
        : Promise.reject(new Error('La suppression n\'est pas implémentée')),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('drivers');
        queryClient.invalidateQueries('dashboard');
      },
      onError: (err) => {
        alert(`Erreur lors de la suppression : ${err.message}`);
      }
    }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Chargement des chauffeurs...</p>
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
          <span className="block sm:inline">{error.message}</span>
        </div>
      </div>
    );
  }

  // Filtrage côté client
  const filteredDrivers = drivers.filter((driver) => {
    const matchesSearch =
      driver.name?.toLowerCase().includes(search.toLowerCase()) ||
      driver.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || driver.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = (driverId, status) => {
    updateStatusMutation.mutate({ driverId, status });
  };

  const handleSuspend = (driverId) => {
    const reason = window.prompt('Veuillez saisir la raison de la suspension :');
    if (reason) {
      suspendMutation.mutate({ driverId, reason });
    }
  };

  const handleDelete = (driverId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce chauffeur ? Cette action est irréversible.')) {
      deleteMutation.mutate(driverId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Gestion des chauffeurs</h1>

        {/* Filtres et recherche */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
            <option value="pending">En attente</option>
            <option value="suspended">Suspendu</option>
            <option value="rejected">Rejeté</option>
          </select>
          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
            }}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Réinitialiser
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Nom</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Statut</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Note</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Documents</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    Aucun chauffeur trouvé
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((driver) => (
                  <tr key={driver.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">{driver.name || 'N/A'}</td>
                    <td className="px-6 py-4">{driver.email || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          driver.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : driver.status === 'inactive'
                            ? 'bg-yellow-100 text-yellow-700'
                            : driver.status === 'suspended'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {driver.status?.charAt(0).toUpperCase() + driver.status?.slice(1) || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">⭐ {(driver.rating ?? 0).toFixed(1)}</td>
                    <td className="px-6 py-4">
                      {driver.documents?.length > 0 ? (
                        <span className="text-green-600">{driver.documents.length} téléchargé(s)</span>
                      ) : (
                        <span className="text-red-600">En attente</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() =>
                            handleUpdateStatus(
                              driver.id,
                              driver.status === 'active' ? 'inactive' : 'active'
                            )
                          }
                          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-opacity-90"
                        >
                          {driver.status === 'active' ? 'Désactiver' : 'Activer'}
                        </button>
                        <button
                          onClick={() => handleSuspend(driver.id)}
                          className="bg-orange-600 text-white px-3 py-1 rounded hover:bg-opacity-90"
                        >
                          Suspendre
                        </button>
                        <button
                          onClick={() => handleDelete(driver.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-opacity-90"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}