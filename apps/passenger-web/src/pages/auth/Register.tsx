import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { register } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    try {
      await register(name, email, phone, password, role);
      navigate('/verify-email'); // Redirect to email verification
    } catch (err: any) {
      setError(err.response?.data?.message || 'Échec de l\'inscription');
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

      <main id="main-content">
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md space-y-8">
            <div>
              <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
                Créer votre compte TaxiLibre
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Déjà un compte ?
                <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Se connecter
                </a>
              </p>
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <fieldset>
                <legend className="sr-only">Informations du compte</legend>
                <div>
                  <label htmlFor="name" className="sr-only">
                    Nom complet
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    aria-required="true"
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Nom complet"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="sr-only">
                    Adresse e-mail
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    aria-required="true"
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Adresse e-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="sr-only">
                    Numéro de téléphone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    aria-required="true"
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Numéro de téléphone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="sr-only">
                    Mot de passe
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    aria-required="true"
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="sr-only">
                    Confirmer le mot de passe
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    aria-required="true"
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Confirmer le mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </fieldset>

              <fieldset>
                <legend className="sr-only">Type de compte</legend>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      id="role-passenger"
                      name="role-passenger"
                      type="radio"
                      value="passenger"
                      checked={role === 'passenger'}
                      onChange={() => setRole('passenger')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      aria-checked={role === 'passenger'}
                    />
                    <label htmlFor="role-passenger" className="ml-2 block text-sm font-medium text-gray-900">
                      Je suis passager
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="role-driver"
                      name="role-driver"
                      type="radio"
                      value="driver"
                      checked={role === 'driver'}
                      onChange={() => setRole('driver')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      aria-checked={role === 'driver'}
                    />
                    <label htmlFor="role-driver" className="ml-2 block text-sm font-medium text-gray-900">
                      Je suis chauffeur
                    </label>
                  </div>
                </div>
              </fieldset>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {loading ? 'Création du compte...' : 'Créer le compte'}
                </button>
              </div>
            </form>

            {error && (
              <div role="alert" className="mt-3 p-4 bg-red-50 border border-red-200 text-red-600 rounded-md">
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default Register;