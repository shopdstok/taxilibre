import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../services/api.js';
import toast from 'react-hot-toast';

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: serverSettings, isLoading } = useQuery({ queryKey: ['admin-settings'], queryFn: adminAPI.getSettings });
  const [form, setForm] = useState({ baseFare: '2.50', pricePerKm: '1.50', platformFee: '15', enableRegistrations: true, enableDriverApprovals: true, enableRealTimeTracking: true });

  useEffect(() => {
    if (serverSettings?.data) {
      const s = serverSettings.data;
      setForm({ baseFare: s.baseFare ?? '2.50', pricePerKm: s.pricePerKm ?? '1.50', platformFee: s.platformFee ?? '15', enableRegistrations: s.enableRegistrations ?? true, enableDriverApprovals: s.enableDriverApprovals ?? true, enableRealTimeTracking: s.enableRealTimeTracking ?? true });
    }
  }, [serverSettings]);

  const saveMutation = useMutation({
    mutationFn: (data) => adminAPI.updateSettings(data),
    onSuccess: () => { toast.success('Parametres sauvegardes'); queryClient.invalidateQueries({ queryKey: ['admin-settings'] }); },
    onError: (err) => toast.error(`Erreur: ${err.message}`),
  });

  const handleChange = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [field]: val }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({ baseFare: +form.baseFare, pricePerKm: +form.pricePerKm, platformFee: +form.platformFee, enableRegistrations: form.enableRegistrations, enableDriverApprovals: form.enableDriverApprovals, enableRealTimeTracking: form.enableRealTimeTracking });
  };

  if (isLoading) return (<div className="min-h-screen bg-gray-100 p-8"><div className="flex items-center justify-center h-[60vh]"><div className="text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /><p className="mt-2 text-gray-600">Chargement...</p></div></div></div>);

  return (
    <div className="min-h-screen bg-gray-100 p-8"><div className="max-w-2xl mx-auto"><div className="bg-white rounded-lg shadow p-6"><h1 className="text-3xl font-bold mb-6">Parametres</h1>
    <form onSubmit={handleSubmit} className="space-y-6">
    <div><h2 className="text-xl font-semibold mb-4">Tarification</h2><div className="space-y-4">
    <div><label className="block text-sm font-medium text-gray-900">Tarif de base (EUR)</label><input type="number" value={form.baseFare} onChange={handleChange('baseFare')} step="0.01" min="0" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
    <div><label className="block text-sm font-medium text-gray-900">Prix par KM (EUR)</label><input type="number" value={form.pricePerKm} onChange={handleChange('pricePerKm')} step="0.01" min="0" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
    <div><label className="block text-sm font-medium text-gray-900">Commission plateforme (%)</label><input type="number" value={form.platformFee} onChange={handleChange('platformFee')} step="0.1" min="0" max="100" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
    </div></div><hr />
    <div><h2 className="text-xl font-semibold mb-4">Systeme</h2><div className="space-y-4">
    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.enableRegistrations} onChange={handleChange('enableRegistrations')} className="rounded" /><span>Activer les inscriptions</span></label>
    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.enableDriverApprovals} onChange={handleChange('enableDriverApprovals')} className="rounded" /><span>Validation chauffeurs</span></label>
    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.enableRealTimeTracking} onChange={handleChange('enableRealTimeTracking')} className="rounded" /><span>Suivi temps reel</span></label>
    </div></div>
    <button type="submit" disabled={saveMutation.isPending} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50">{saveMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}</button>
    </form></div></div></div>
  );
}