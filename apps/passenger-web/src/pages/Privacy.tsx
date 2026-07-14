import React from 'react';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-gray-600 mb-4">
          Last updated: January 1, 2024
        </p>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Information We Collect</h2>
          <p className="text-gray-700 mb-2">
            We collect personal information such as name, email, phone number, payment details, and location data to provide and improve our services.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">How We Use Your Information</h2>
          <p className="text-gray-700 mb-2">
            Your information is used to process rides, manage your account, send communications, and enhance security and fraud prevention.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">Sharing Your Information</h2>
          <p className="text-gray-700 mb-2">
            We share information with drivers for ride fulfillment, payment processors for transactions, and service providers for analytics and support.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Security</h2>
          <p className="text-gray-700 mb-2">
            We employ industry-standard encryption and security measures to protect your data from unauthorized access.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Rights</h2>
          <p className="text-gray-700 mb-2">
            You have the right to access, correct, delete, or restrict the use of your personal information by contacting our privacy team.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">Cookie Policy</h2>
          <p className="text-gray-700 mb-2">
            We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. See our Cookie Policy for details.
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

export default Privacy;
