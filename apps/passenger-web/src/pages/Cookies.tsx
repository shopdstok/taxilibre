import React from 'react';

const Cookies = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Cookie Policy</h1>
        <p className="text-gray-600 mb-4">
          Last updated: January 1, 2024
        </p>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">What Are Cookies?</h2>
          <p className="text-gray-700 mb-2">
            Cookies are small text files stored on your device that help websites remember information about your visit.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">How We Use Cookies</h2>
          <p className="text-gray-700 mb-2">
            We use cookies for: essential site functionality, remembering your preferences, analytics and performance tracking, and advertising and marketing purposes.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">Types of Cookies We Use</h2>
          <div className="space-y-2">
            <div className="flex items-start">
              <span className="font-medium text-gray-900">• </span>
              <span className="text-gray-700">Essential Cookies: Necessary for the website to function properly.</span>
            </div>
            <div className="flex items-start">
              <span className="font-medium text-gray-900">• </span>
              <span className="text-gray-700">Preference Cookies: Remember your language, region, and other settings.</span>
            </div>
            <div className="flex items-start">
              <span className="font-medium text-gray-900">• </span>
              <span className="text-gray-700">Analytics Cookies: Help us understand how visitors interact with our site.</span>
            </div>
            <div className="flex items-start">
              <span className="font-medium text-gray-900">• </span>
              <span className="text-gray-700">Marketing Cookies: Used to deliver personalized advertisements.</span>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">Managing Cookies</h2>
          <p className="text-gray-700 mb-2">
            You can control and manage cookies through your browser settings. Please note that disabling certain cookies may affect site functionality.
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

export default Cookies;
