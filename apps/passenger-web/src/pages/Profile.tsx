import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Profile() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    dateOfBirth: user?.dateOfBirth || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await updateProfile(formData);
      setSuccess('Profil mis à jour avec succès !');
      // Scroll to success message
      const successElement = document.getElementById('success-message');
      if (successElement) {
        successElement.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="absolute left-0 top-0 px-3 py-2 bg-blue-600 text-white transform -translate-y-4 transition-transform duration-200 focus:translate-y-0 z-50"
      >
        Passer au contenu principal
      </a>

      <main id="main-content" className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
          {/* Success Message */}
          {success && (
            <div id="success-message" role="alert" className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 text-green-800">
              {success}
              <button
                onClick={() => setSuccess(null)}
                className="ml-2 text-sm font-medium text-green-600 hover:underline"
                aria-label="Fermer la notification de succès"
              >
                ×
              </button>
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div role="alert" className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-800">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-2 text-sm font-medium text-red-600 hover:underline"
                aria-label="Fermer la notification d'erreur"
              >
                ×
              </button>
            </div>
          )}

          <h1 className="text-3xl font-bold mb-6" id="profile-heading">
            Mon profil
          </h1>

          <form onSubmit={handleSubmit} noValidate>
            <fieldset>
              <legend className="sr-only">Informations personnelles</legend>
              
              <div className="space-y-6">
                <div>
                  <label htmlFor="first-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Prénom
                  </label>
                  <input
                    id="first-name"
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border-gray-300 border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-required="true"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="last-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de famille
                  </label>
                  <input
                    id="last-name"
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border-gray-300 border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-required="true"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse e-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border-gray-300 border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-required="true"
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de téléphone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border-gray-300 border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Numéro de téléphone"
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows="3"
                    className="mt-1 block w-full rounded-lg border-gray-300 border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Adresse complète"
                    placeholder="123 Rue de Paris, 75001 Paris"
                  />
                </div>

                <div>
                  <label htmlFor="date-of-birth" className="block text-sm font-medium text-gray-700 mb-2">
                    Date de naissance
                  </label>
                  <input
                    id="date-of-birth"
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border-gray-300 border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </fieldset>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                aria-disabled={loading}
              >
                {loading ? 'Mise à jour en cours...' : 'Enregistrer les modifications'}
              </button>
            </div>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Retour au tableau de bord
              </div>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}