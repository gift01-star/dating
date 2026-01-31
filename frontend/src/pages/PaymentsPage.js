import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

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
  const [provider, setProvider] = useState('flutterwave'); // 'flutterwave' or 'paychangu'
  const [providerMethod, setProviderMethod] = useState('card'); // 'card' or 'mobilemoney'
  const [phoneNumber, setPhoneNumber] = useState('');
  const query = useQuery();

  const navigate = useNavigate();
  const profileCompletion = user?.profileCompletion || 0;

  useEffect(() => {
    // Accept multiple potential query names for the returned session/payment id
    const sessionId = query.get('sessionId') || query.get('session') || query.get('paymentId') || query.get('id');
    const matchId = query.get('matchId');
    const plan = query.get('plan');

    const checkSession = async (id) => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/payments/sessions/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const status = res.data.payment?.status;
        setMessage(`Payment status: ${status}`);

        // If payment succeeded, navigate back to chat if matchId provided
        if (status === 'succeeded' && matchId) {
          navigate(`/chat/${matchId}`);
        }

        return res.data.payment;
      } catch (err) {
        if (err.response && err.response.status === 404) {
          // Try to fetch latest pending payment for the user (optionally filtered by matchId)
          try {
            const token = localStorage.getItem('token');
            const searchRes = await axios.get(`${API_URL}/payments/latest${matchId ? `?matchId=${matchId}` : ''}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const payment = searchRes.data.payment;
            if (payment) {
              setMessage('Found pending payment for this session.');
              return payment;
            }
          } catch (searchErr) {
            setMessage('No pending payment found for this session.');
          }
        } else {
          setMessage('Unable to fetch payment status.');
        }
      }

      return null;
    };

    (async () => {
      // If a plan param is provided and no explicit session id, start checkout automatically (convenience for redirect links)
      if (plan && !sessionId) {
        const token = localStorage.getItem('token');
        if (!token) {
          setMessage('Please log in to complete a payment.');
          return;
        }

        setMessage(`Starting checkout for ${plan}...`);
        await startCheckout(plan);
        return;
      }

      if (sessionId) {
        await checkSession(sessionId);
      } else if (matchId) {
        // no explicit session id — try to find pending payment for matchId
        try {
          const token = localStorage.getItem('token');
          const searchRes = await axios.get(`${API_URL}/payments/latest?matchId=${matchId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const payment = searchRes.data.payment;
          if (payment) {
            setMessage('Found pending payment for this match.');
          }
        } catch (err) {
          // nothing found — user can start checkout manually
        }
      }
    })();
  }, [query, navigate]);

  const startCheckout = async (planId) => {
    // Require 50% profile completion on the client as well (server enforces too)
    if (profileCompletion < 50) {
      setMessage('Please complete your profile to at least 50% before making a payment.');
      return;
    }

    // If mobile money selected, ensure phone provided
    if (providerMethod === 'mobilemoney' && !phoneNumber) {
      setMessage('Please provide a phone number for mobile money payments.');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const matchId = query.get('matchId');

      const res = await axios.post(`${API_URL}/payments/create-session`, { planId, matchId, provider, providerMethod, phoneNumber }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { checkoutUrl } = res.data;
      if (checkoutUrl) {
        // Redirect to checkout (provider's hosted page)
        window.location.href = checkoutUrl;
      } else {
        setMessage('Could not create checkout session');
      }
    } catch (error) {
      // Show server-provided guidance when profile incomplete
      if (error.response?.status === 403) {
        setMessage(error.response?.data?.error || 'Please complete your profile before making a payment.');
        return;
      }

      setMessage(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  // Test-only: complete payment (marks payment succeeded and unlocks messaging)
  const completeTestPayment = async (paymentId) => {
    // accept optional paymentId; fall back to sessionId in query
    const sessionId = paymentId || query.get('sessionId');
    const matchId = query.get('matchId');
    if (!sessionId) return setMessage('No session or payment id provided');

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/payments/complete/${sessionId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage(res.data?.message || 'Payment completed');

      // Navigate back to chat if a matchId exists
      if (matchId) {
        navigate(`/chat/${matchId}`);
      }
    } catch (err) {
      setMessage(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper: find latest pending payment for current user (optionally pass matchId)
  const findLatestPending = async () => {
    const matchId = query.get('matchId');
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/payments/latest${matchId ? `?matchId=${matchId}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const payment = res.data.payment;
      if (payment) {
        setMessage('Found pending payment. You can complete it below (DEV).');
        return payment;
      }
    } catch (err) {
      setMessage(err.response?.data?.error || 'No pending payment found.');
    } finally {
      setLoading(false);
    }

    return null;
  };


  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Payments & Subscriptions</h1>
      {message && <div className="p-3 mb-4 bg-green-100 text-green-800 rounded">{message}</div>}

      {/* When redirected back to payments with a sessionId, offer a test-complete button for local/testing flows */}
      <div className="mb-4">
        <button onClick={async () => {
          const payment = await findLatestPending();
          if (payment) completeTestPayment(payment._id);
        }} disabled={loading} className="mr-2 bg-yellow-400 text-white py-2 px-3 rounded">{loading ? 'Processing...' : 'Find & complete pending payment (DEV)'}</button>

        {query.get('sessionId') && (
          <button onClick={() => completeTestPayment()} disabled={loading} className="ml-2 bg-yellow-400 text-white py-2 px-3 rounded">{loading ? 'Processing...' : 'Complete test payment (DEV)'}</button>
        )}
      </div>

      <div className="mb-4 border rounded p-4">
        <h3 className="font-semibold mb-2">Payment provider & method</h3>
        <div className="flex gap-4 mb-3">
          <label className="inline-flex items-center">
            <input type="radio" name="provider" checked={provider === 'flutterwave'} onChange={() => setProvider('flutterwave')} className="mr-2" />
            <span>Flutterwave</span>
          </label>
          <label className="inline-flex items-center">
            <input type="radio" name="provider" checked={provider === 'paychangu'} onChange={() => setProvider('paychangu')} className="mr-2" />
            <span>Paychangu (fallback)</span>
          </label>
        </div>

        {provider === 'flutterwave' && (
          <div className="mb-2">
            <label className="inline-flex items-center mr-4">
              <input type="radio" name="providerMethod" checked={providerMethod === 'card'} onChange={() => setProviderMethod('card')} className="mr-2" />
              <span>Card</span>
            </label>
            <label className="inline-flex items-center">
              <input type="radio" name="providerMethod" checked={providerMethod === 'mobilemoney'} onChange={() => setProviderMethod('mobilemoney')} className="mr-2" />
              <span>Mobile Money (Airtel/TNM)</span>
            </label>
          </div>
        )}

        {provider === 'flutterwave' && providerMethod === 'mobilemoney' && (
          <div className="mb-2">
            <label className="block text-sm">Phone number for mobile money</label>
            <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="e.g., +265881234567" className="mt-1 p-2 border rounded w-full" />
            <div className="text-xs text-gray-500 mt-1">Flutterwave will use this number for the mobile-money collection flow.</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Plans.map(plan => (
          <div key={plan.id} className="border rounded p-4">
            <h2 className="text-lg font-semibold">{plan.name}</h2>
            <p className="text-sm text-gray-600">{plan.description}</p>
            <div className="mt-4 text-xl font-bold">${plan.price}</div>
            <button
              onClick={() => startCheckout(plan.id)}
              disabled={loading || profileCompletion < 50}
              className={`mt-4 w-full py-2 rounded ${profileCompletion < 50 ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-pink-500 text-white hover:bg-pink-600'}`}
            >
              {loading ? 'Processing...' : `Choose ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4">
        {message && (
          <div className="p-3 mb-4 rounded text-sm whitespace-pre-wrap">
            <div className="bg-red-100 text-red-800 p-3 rounded mb-2">{message}</div>
            {profileCompletion < 50 && (
              <div className="flex gap-2">
                <button onClick={() => navigate('/profile')} className="btn-primary">Complete Profile</button>
                <div className="text-sm text-gray-600 flex items-center">Your profile is {profileCompletion}% complete. You need at least 50% to make payments.</div>
              </div>
            )}
          </div>
        )}

        <div className="text-sm text-gray-500">
          <p>Payments may be processed using Flutterwave (cards & mobile money) or Paychangu in test mode. No real charges occur in development/test mode.</p>
        </div>
      </div>
    </div>
  );
}
