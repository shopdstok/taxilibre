import React from 'react';

const Help = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Help Center</h1>
        <p className="text-gray-600 mb-4">
          Find answers to common questions about using TaxiLibre.
        </p>

        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">How to book a ride?</h3>
            <p className="text-gray-700">
              Open the app, enter your pickup and drop-off locations, choose your ride type, and confirm your booking.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">How to pay for a ride?</h3>
            <p className="text-gray-700">
              Payment is automatically processed using your saved payment method after the ride completes.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">How to become a driver?</h3>
            <p className="text-gray-700">
              Visit our driver signup page, submit your documents, and complete the background check.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
