import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../services/api.js';
import toast from 'react-hot-toast';

export default function Users() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const { data: users = [], isLoading, isError, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminAPI.getUsers,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }) => adminAPI.updateUserStatus(userId, isActive),
    onSuccess: (_, vars) => {
      toast.success(`Utilisateur ${vars.isActive ? 'active' : 'desactive'}`);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId) => adminAPI.deleteUser(userId),
    onSuccess: () => {
      toast.success('Utilisateur supprime');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  });

  const usersArray = Array.isArray(users) ? users : users?.data ?? [];

  const filtered = usersArray.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleToggleStatus = (user) => {
    const newStatus = !(user.isActive ?? true);
    toggleStatusMutation.mutate({ userId: user.id, isActive: newStatus });
  };

  const handleDelete = (userId) => {
    if (window.confirm('Supprimer cet utilisateur ? Action irreversible.')) {
      deleteMutation.mutate(userId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-gray-600">Chargement des utilisateurs...</p>
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
        <h1 className="text-3xl font-bold mb-6">Gestion des utilisateurs</h1>

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <input type="text" placeholder="Rechercher par nom ou email..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Tous les roles</option>
            <option value="passenger">Passager</option>
            <option value="driver">Chauffeur</option>
            <option value="admin">Admin</option>
          </select>
          <button onClick={() => { setSearch(''); setRoleFilter('all'); }}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm">
            Reinitialiser
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Nom</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Role</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Statut</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">Aucun utilisateur trouve</td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">{user.name || 'N/A'}</td>
                    <td className="px-6 py-4">{user.email || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${user.role === 'driver' ? 'text-blue-600' : user.role === 'admin' ? 'text-purple-600' : 'text-green-600'}`}>
                        {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${(user.isActive ?? true) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {(user.isActive ?? true) ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => handleToggleStatus(user)}
                          disabled={toggleStatusMutation.isPending}
                          className={`px-3 py-1 rounded text-sm text-white disabled:opacity-50 ${(user.isActive ?? true) ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                          {(user.isActive ?? true) ? 'Desactiver' : 'Activer'}
                        </button>
                        <button onClick={() => handleDelete(user.id)}
                          disabled={deleteMutation.isPending}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50">
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