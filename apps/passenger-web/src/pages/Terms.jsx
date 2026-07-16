import React from 'react';

const Terms = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
        <p className="text-gray-600 mb-4">
          Last updated: January 1, 2024
        </p>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Acceptance of Terms</h2>
          <p className="text-gray-700 mb-2">
            By using the TaxiLibre application and website, you agree to comply with and be bound by these Terms of Service.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Registration</h2>
          <p className="text-gray-700 mb-2">
            You must provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">Ride Services</h2>
          <p className="text-gray-700 mb-2">
            TaxiLibre connects passengers with independent driver partners. We are not liable for the actions of drivers or passengers during rides.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">Payments</h2>
          <p className="text-gray-700 mb-2">
            Fares are automatically charged to your selected payment method. Disputes must be reported within 48 hours of ride completion.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">Limitation of Liability</h2>
          <p className="text-gray-700 mb-2">
            To the maximum extent permitted by law, TaxiLibre shall not be liable for any indirect, incidental, special, consequential, or punitive damages.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">Governing Law</h2>
          <p className="text-gray-700 mb-2">
            These Terms shall be governed by and construed in accordance with the laws of [Your Country/State], without regard to its conflict of law principles.
          </p>
        </div>

        <div className="mt-6">
          <a href="/" className="text-blue-600 hover:text-blue-800">
            ← Return to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default Terms;