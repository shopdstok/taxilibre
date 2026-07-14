import React from 'react';

export default function Settings() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        
        <form className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Pricing</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900">Base Fare (€)</label>
                <input
                  type="number"
                  defaultValue="2.50"
                  step="0.01"
                  className="mt-1 block w-full rounded-lg border-gray-300 border px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900">Price per KM (€)</label>
                <input
                  type="number"
                  defaultValue="1.50"
                  step="0.01"
                  className="mt-1 block w-full rounded-lg border-gray-300 border px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900">Platform Fee (%)</label>
                <input
                  type="number"
                  defaultValue="15"
                  step="0.1"
                  className="mt-1 block w-full rounded-lg border-gray-300 border px-3 py-2"
                />
              </div>
            </div>
          </div>

          <hr />

          <div>
            <h2 className="text-xl font-semibold mb-4">System Settings</h2>
            
            <div className="space-y-4">
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="ml-2">Enable new user registrations</span>
              </label>

              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="ml-2">Enable driver approvals</span>
              </label>

              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="rounded" />
                <span className="ml-2">Enable real-time tracking</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold"
          >
            Save Settings
          </button>
        </form>
      </div>
    </div>
  );
}
