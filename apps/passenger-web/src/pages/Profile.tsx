import React from 'react';

export default function Profile() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold mb-6">My Profile</h1>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900">Name</label>
            <input
              type="text"
              defaultValue="John Doe"
              className="mt-1 block w-full rounded-lg border-gray-300 border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900">Email</label>
            <input
              type="email"
              defaultValue="john@example.com"
              className="mt-1 block w-full rounded-lg border-gray-300 border px-3 py-2"
              disabled
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900">Phone</label>
            <input
              type="tel"
              defaultValue="+1234567890"
              className="mt-1 block w-full rounded-lg border-gray-300 border px-3 py-2"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
