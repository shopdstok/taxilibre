import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../services/api.js';
import toast from 'react-hot-toast';

const STATUS_LABELS = {
  open:       'Ouvert',
  in_progress:'En cours',
  resolved:   'Résolu',
  closed:     'Fermé',
};

const STATUS_COLORS = {
  open:        'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved:    'bg-green-100 text-green-700',
  closed:      'bg-gray-100 text-gray-700',
};

export default function Support() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: tickets = [], isLoading, isError, error } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: adminAPI.getSupportTickets,
  });

  const updateMutation = useMutation({
    mutationFn: ({ ticketId, data }) => adminAPI.updateSupportTicket(ticketId, data),
    onSuccess: () => {
      toast.success('Ticket mis à jour');
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  });

  const handleResolve = (ticketId) => {
    updateMutation.mutate({ ticketId, data: { status: 'resolved' } });
  };

  const handleClose = (ticketId) => {
    updateMutation.mutate({ ticketId, data: { status: 'closed' } });
  };

  const filtered = (Array.isArray(tickets) ? tickets : tickets?.data ?? []).filter((t) => {
    const q = search.toLowerCase();
    const matchSearch = !q || String(t.id).includes(q) || t.userName?.toLowerCase().includes(q) || t.subject?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-gray-600">Chargement des tickets...</p>
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
        <h1 className="text-3xl font-bold mb-6">Tickets de support</h1>

        {/* Filtres */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <input
            type="text"
            placeholder="Rechercher par ID, utilisateur ou sujet..."
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
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button
            onClick={() => { setSearch(''); setStatusFilter('all'); }}
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
                <th className="px-6 py-3 text-left text-sm font-semibold">Utilisateur</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Sujet</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Statut</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Aucun ticket trouvé
                  </td>
                </tr>
              ) : (
                filtered.map((ticket) => (
                  <tr key={ticket.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm">#{ticket.id}</td>
                    <td className="px-6 py-4">{ticket.userName || 'N/A'}</td>
                    <td className="px-6 py-4">{ticket.subject || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${STATUS_COLORS[ticket.status] || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABELS[ticket.status] || ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('fr-FR') : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {ticket.status === 'open' && (
                          <button
                            onClick={() => handleResolve(ticket.id)}
                            disabled={updateMutation.isPending}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                          >
                            Résoudre
                          </button>
                        )}
                        {(ticket.status === 'open' || ticket.status === 'in_progress') && (
                          <button
                            onClick={() => handleClose(ticket.id)}
                            disabled={updateMutation.isPending}
                            className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 disabled:opacity-50"
                          >
                            Fermer
                          </button>
                        )}
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