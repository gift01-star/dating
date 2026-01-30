import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL;

const Plans = [
  { id: 'basic', name: 'Basic', price: 19.99, description: 'Basic membership' },
  { id: 'premium', name: 'Premium', price: 49.99, description: 'Premium membership' },
  { id: 'platinum', name: 'Platinum', price: 99.99, description: 'Platinum membership' }
];

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function PaymentsPage({ user }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const query = useQuery();

  useEffect(() => {
    const sessionId = query.get('sessionId');
    if (sessionId) {
      // poll session status
      (async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get(`${API_URL}/payments/sessions/${sessionId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const status = res.data.payment?.status;
          setMessage(`Payment status: ${status}`);
        } catch (err) {
          setMessage('Unable to fetch payment status.');
        }
      })();
    }
  }, [query]);

  const startCheckout = async (planId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/payments/create-session`, { planId }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { checkoutUrl } = res.data;
      if (checkoutUrl) {
        // Redirect to checkout (placeholder/test)
        window.location.href = checkoutUrl;
      } else {
        setMessage('Could not create checkout session');
      }
    } catch (error) {
      setMessage(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Payments & Subscriptions</h1>
      {message && <div className="p-3 mb-4 bg-green-100 text-green-800 rounded">{message}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Plans.map(plan => (
          <div key={plan.id} className="border rounded p-4">
            <h2 className="text-lg font-semibold">{plan.name}</h2>
            <p className="text-sm text-gray-600">{plan.description}</p>
            <div className="mt-4 text-xl font-bold">${plan.price}</div>
            <button
              onClick={() => startCheckout(plan.id)}
              disabled={loading}
              className="mt-4 w-full bg-pink-500 text-white py-2 rounded hover:bg-pink-600"
            >
              {loading ? 'Processing...' : `Choose ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 text-sm text-gray-500">
        <p>Payments are processed using Paychangu in test mode. No cards are charged during tests.</p>
      </div>
    </div>
  );
}
