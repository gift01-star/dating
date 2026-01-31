import React from 'react';

export default function PaymentsPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Payments Temporarily Disabled</h1>
        <p className="text-gray-600 mb-6">We have temporarily disabled payments while we prepare the production payment integration. All messaging is free and unlimited.</p>
        <p className="text-gray-500 mb-6">If you need to upgrade or report a billing issue, please contact support.</p>
        <button onClick={() => window.location.href = '/profile'} className="btn-primary">Go to Profile</button>
      </div>
    </div>
  );
}






