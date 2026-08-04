import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate, useLocation } from 'react-router-dom';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  // Handle Enter key in password field to submit form
  const handlePasswordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Form will submit automatically
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      // Redirect to intended page or home
      const redirectTo = location.state?.from?.pathname || '/';
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Échec de connexion');
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

      <main id="main-content" className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
              Connectez-vous à TaxiLibre
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Ou
              <a href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                créez un compte
              </a>
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
                aria-label="Adresse e-mail"
                aria-required="true"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Adresse e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="flex justify-between">
                <label htmlFor="password" className="sr-only">
                  Mot de passe
                </label>
                <div className="text-sm">
                  <a
                    href="/forgot-password"
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                    aria-label="Mot de passe oublié"
                  >
                    Mot de passe oublié ?
                  </a>
                </div>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                aria-label="Mot de passe"
                aria-required="true"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handlePasswordKeyPress}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="remember-me" className="font-medium text-gray-700">
                    Se souvenir de moi
                  </label>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                aria-disabled={loading}
              >
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </button>
            </div>
          </form>

          {error && (
            <div role="alert" className="mt-3 p-4 bg-red-50 border border-red-200 text-red-600 rounded-md">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full bg-gray-200" aria-hidden="true" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">
                  Ou continuer avec
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <button
                type="button"
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <img src="/google-icon.svg" alt="Google" className="h-5 w-5 mr-3" />
                Se connecter avec Google
              </button>
              <button
                type="button"
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <img src="/apple-icon.svg" alt="Apple" className="h-5 w-5 mr-3" />
                Se connecter avec Apple
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default Login;