import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { adminAPI } from '../services/api.js';
import toast from 'react-hot-toast';

const STATUS_LABELS = {
  pending:    'En attente',
  accepted:   'Acceptée',
  in_progress:'En cours',
  completed:  'Terminée',
  cancelled:  'Annulée',
};

const STATUS_COLORS = {
  pending:     'bg-yellow-100 text-yellow-700',
  accepted:    'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-700',
};

export default function Rides() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: ridesData, isLoading, isError, error } = useQuery({
    queryKey: ['admin-rides', { page, limit, status: statusFilter }],
    queryFn: () => adminAPI.getRides({ page, limit, status: statusFilter !== 'all' ? statusFilter : undefined }),
    placeholderData: keepPreviousData,
  });

  const rides = ridesData?.data ?? [];
  const totalPages = ridesData?.pagination?.totalPages ?? 1;

  const filteredRides = rides.filter((ride) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      String(ride.id).includes(q) ||
      ride.passengerName?.toLowerCase().includes(q) ||
      ride.driverName?.toLowerCase().includes(q)
    );
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-gray-600">Chargement des courses...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
          <strong className="font-bold">Erreur !</strong>
          <span className="block sm:inline"> {error.message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Gestion des courses</h1>

        {/* Filtres */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="Rechercher par ID, passager ou chauffeur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button
            onClick={() => { setSearch(''); setStatusFilter('all'); setPage(1); }}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm"
          >
            Réinitialiser
          </button>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Passager</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Chauffeur</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Statut</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Montant</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredRides.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Aucune course trouvée
                  </td>
                </tr>
              ) : (
                filteredRides.map((ride) => (
                  <tr key={ride.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm">#{ride.id}</td>
                    <td className="px-6 py-4">{ride.passengerName || 'N/A'}</td>
                    <td className="px-6 py-4">{ride.driverName || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${STATUS_COLORS[ride.status] || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABELS[ride.status] || ride.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold">
                      €{(ride.amount ?? 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {ride.createdAt ? new Date(ride.createdAt).toLocaleDateString('fr-FR') : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              ← Précédent
            </button>
            <span className="px-4 py-2 text-gray-600">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Suivant →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}