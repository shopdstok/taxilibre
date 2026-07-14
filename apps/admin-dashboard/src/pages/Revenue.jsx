import React from 'react';

export default function Revenue() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Revenue Analytics</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 text-sm font-semibold">Total Revenue</h3>
            <p className="text-3xl font-bold mt-2">€98,765</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 text-sm font-semibold">Platform Fees</h3>
            <p className="text-3xl font-bold mt-2">€14,815</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-600 text-sm font-semibold">Driver Earnings</h3>
            <p className="text-3xl font-bold mt-2">€83,950</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Revenue Breakdown by Period</h2>
          <div className="space-y-4">
            {['Week', 'Month', 'Quarter', 'Year'].map((period) => (
              <div key={period} className="flex justify-between items-center border-b pb-3">
                <span className="font-semibold">{period}ly Revenue</span>
                <span className="text-lg font-semibold">€{(Math.random() * 25000 + 10000).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
