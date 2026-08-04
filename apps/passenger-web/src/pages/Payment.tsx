import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

// Define types for our params
interface PaymentParams {
  rideId?: string;
}

const Payment = () => {
  const navigate = useNavigate();
  const { rideId } = useParams<PaymentParams>();
  const location = useLocation();
  const [paymentMethod, setPaymentMethod] = useState<string>('card');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [expiry, setExpiry] = useState<string>('');
  const [cvv, setCvv] = useState<string>('');

  // For card number formatting
  const formatCardNumber = (value: string): string => {
    const cleaned = value.replace(/\s/g, '');
    const parts = [];
    for (let i = 0; i < cleaned.length; i += 4) {
      parts.push(cleaned.substring(i, Math.min(i + 4, cleaned.length)));
    }
    return parts.join(' ');
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardNumber(formatCardNumber(e.target.value));
  };

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation
    if (!cardNumber.replace(/\s/g, '').match(/^\d{13,19}$/)) {
      alert('Veuillez entrer un numéro de carte valide');
      return;
    }
    
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      alert('Veuillez entrer une date d\'expiration valide (MM/AA)');
      return;
    }
    
    if (!cvv.match(/^\d{3,4}$/)) {
      alert('Veuillez entrer un CVV valide');
      return;
    }

    // Mock payment processing using rideId
    if (rideId) {
      alert(`Paiement traité avec succès pour le trajet ${rideId}!`);
    } else {
      alert('Paiement traité avec succès !');
    }
    // Redirect to ride history after payment
    navigate('/ride-history');
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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Paiement</h1>

          {rideId && (
            <div
              className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6"
              role="alert"
              aria-live="polite"
            >
              <p className="text-sm text-blue-800">
                Traitement du paiement pour le trajet #{rideId}
              </p>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6">
            <form onSubmit={handlePayment} noValidate>
              <div className="space-y-6">
                <div>
                  <label htmlFor="payment-method" className="block text-sm font-medium text-gray-700 mb-2">
                    Mode de paiement
                  </label>
                  <select
                    id="payment-method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-required="true"
                  >
                    <option value="card">Carte de crédit/débit</option>
                    <option value="paypal">PayPal</option>
                    <option value="cash">Espèces</option>
                  </select>
                </div>

                {paymentMethod === 'card' && (
                  <fieldset>
                    <legend className="sr-only">Informations de carte bancaire</legend>
                    
                    <div>
                      <label htmlFor="card-number" className="block text-sm font-medium text-gray-700 mb-2">
                        Numéro de carte
                      </label>
                      <input
                        id="card-number"
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="1234 5678 9012 3456"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Numero de carte bancaire"
                        aria-required="true"
                        pattern="[\d\s]{13,19}"
                        inputmode="numeric"
                        maxLength="19"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="expiry-date" className="block text-sm font-medium text-gray-700 mb-2">
                          Date d'expiration
                        </label>
                        <input
                          id="expiry-date"
                          type="text"
                          value={expiry}
                          onChange={(e) => setExpiry(e.target.value.replace(/[^0-9]/g, '').replace(/^(.{2})/, '$1/').substring(0, 5))}
                          placeholder="MM/YY"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label="Date d'expiration de la carte"
                          aria-required="true"
                          pattern="(0[1-9]|1[0-2])\/([0-9]{2})"
                          inputmode="numeric"
                        />
                      </div>

                      <div>
                        <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-2">
                          CVV
                        </label>
                        <input
                          id="cvv"
                          type="text"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, '').substring(0, 4))}
                          placeholder="123"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label="Code de sécurité CVV"
                          aria-required="true"
                          pattern="[0-9]{3,4}"
                          inputmode="numeric"
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </fieldset>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Traiter le paiement
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default Payment;