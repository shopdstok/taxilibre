import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  MapPinIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  ClockIcon,
  StarIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

// Define types for our data structures
interface Feature {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
}

interface Stat {
  label: string;
  value: string;
}

const Home = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const features: Feature[] = [
    {
      icon: MapPinIcon,
      title: 'Suivi en temps réel',
      description: 'Suivez votre course en temps réel de la prise en charge à la destination'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Sûr & Sécurisé',
      description: 'Chauffeurs vérifiés et traitement sécurisé des paiements'
    },
    {
      icon: CreditCardIcon,
      title: 'Paiements faciles',
      description: 'Plusieurs options de paiement incluant cartes et portefeuilles digitaux'
    },
    {
      icon: ClockIcon,
      title: 'Disponible 24/7',
      description: 'Réservez des courses n\'importe quand, n\'importe où avec notre service toujours disponible'
    }
  ];

  const stats: Stat[] = [
    { label: 'Chauffeurs actifs', value: '10,000+' },
    { label: 'Passagers satisfaits', value: '500,000+' },
    { label: 'Villes desservies', value: '50+' },
    { label: 'Note moyenne', value: '4.8' }
  ];

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

        {/* Hero Section */}
        <section aria-labelledby="hero-heading" className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
          <div className="container py-20">
            <div className="max-w-3xl mx-auto text-center">
              <h1 id="hero-heading" className="text-4xl md:text-6xl font-bold mb-6">
                Votre trajet, simplifié
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-blue-100">
                Réservez des trajets sûrs et abordables avec des chauffeurs de confiance. Disponible 24/7 dans votre ville.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {isAuthenticated ? (
                  <Link
                    to="/book-ride"
                    className="btn bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold inline-flex items-center justify-center"
                  >
                    Réserver une course maintenant
                    <ArrowRightIcon className="w-5 h-5 ml-2" aria-hidden="true" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="btn bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
                    >
                      Commencer
                    </Link>
                    <Link
                      to="/login"
                      className="btn border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3 text-lg font-semibold"
                    >
                      Se connecter
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section aria-labelledby="stats-heading" className="bg-white py-16">
          <div className="container">
            <h2 id="stats-heading" className="sr-only">Statistiques</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section aria-labelledby="features-heading" className="bg-gray-50 py-20">
          <div className="container">
            <div className="text-center mb-12">
              <h2 id="features-heading" className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Pourquoi choisir TaxiLibre ?
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Découvrez la différence avec nos fonctionnalités centrées sur le passager et notre engagement envers l'excellence.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="card p-6 text-center hover:shadow-lg transition-shadow"
                  role="region"
                  aria-labelledby={`feature-title-${index}`}
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-6 h-6 text-blue-600" aria-hidden="true" />
                  </div>
                  <h3 id={`feature-title-${index}`} className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section aria-labelledby="how-it-works-heading" className="bg-white py-20">
          <div className="container">
            <div className="text-center mb-12">
              <h2 id="how-it-works-heading" className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Comment ça marche
              </h2>
              <p className="text-xl text-gray-600">
                Réservez votre trajet en trois étapes simples
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold" aria-hidden="true">1</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Entrez votre destination
                </h3>
                <p className="text-gray-600">
                  Indiquez où vous voulez aller et nous trouverons le meilleur itinéraire pour vous.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold" aria-hidden="true">2</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Trouver un chauffeur
                </h3>
                <p className="text-gray-600">
                  Nous vous mettrons en relation avec un chauffeur à proximité et vous enverrons ses détails.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl font-bold" aria-hidden="true">3</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Profitez de votre trajet
                </h3>
                <p className="text-gray-600">
                  Suivez votre chauffeur en temps réel et profitez d'un trajet confortable jusqu'à destination.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section aria-labelledby="cta-heading" className="bg-blue-600 text-white py-16">
          <div className="container text-center">
            <h2 id="cta-heading" className="text-3xl md:text-4xl font-bold mb-4">
              Prêt à partir ?
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Rejoignez des milliers de passagers satisfaits et découvrez la différence TaxiLibre.
            </p>
            <Link
              to={isAuthenticated ? "/book-ride" : "/register"}
              className="btn bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold inline-flex items-center"
            >
              {isAuthenticated ? 'Réservez votre premier trajet' : 'Commencer maintenant'}
              <ArrowRightIcon className="w-5 h-5 ml-2" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Testimonials */}
        <section aria-labelledby="testimonials-heading" className="bg-gray-50 py-20">
          <div className="container">
            <div className="text-center mb-12">
              <h2 id="testimonials-heading" className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Ce que nos passagers disent
              </h2>
              <p className="text-xl text-gray-600">
                Expériences réelles de vrais clients
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="card p-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon key={i} className="w-5 h-5 text-yellow-400" aria-hidden="true" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4">
                  "Service incroyable ! Les chauffeurs sont professionnels et l'application est très facile à utiliser. Je l'utilise tous les jours pour mes déplacements."
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-300 rounded-full mr-3" aria-hidden="true"></div>
                  <div>
                    <div className="font-semibold text-gray-900">Sarah Johnson</div>
                    <div className="text-sm text-gray-600">Navetteur quotidien</div>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon key={i} className="w-5 h-5 text-yellow-400" aria-hidden="true" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4">
                  "La meilleure application de réservation de trajet que j'ai utilisée. Prix compétitifs, service fiable et excellent support client."
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-300 rounded-full mr-3" aria-hidden="true"></div>
                  <div>
                    <div className="font-semibold text-gray-900">Mike Chen</div>
                    <div className="text-sm text-gray-600">Voyageur d'affaires</div>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon key={i} className="w-5 h-5 text-yellow-400" aria-hidden="true" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4">
                  "Je me sens en sécurité en utilisant TaxiLibre, surtout pour les trajets de nuit. La fonction de suivi me donne l'esprit tranquille."
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-300 rounded-full mr-3" aria-hidden="true"></div>
                  <div>
                    <div className="font-semibold text-gray-900">Emily Davis</div>
                    <div className="text-sm text-gray-600">Étudiant</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default Home;