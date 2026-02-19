import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaCheckCircle, FaTimesCircle, FaArrowLeft, FaCreditCard } from 'react-icons/fa';
import BottomNavBar from '../components/BottomNavBar';

const API_URL = process.env.REACT_APP_API_URL || 'https://edulove-backend.onrender.com/api';

export default function PaymentsPage({ user }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !user) {
      navigate('/login');
    }
  }, []);

  const rawSessionId = searchParams.get('sessionId');
  // Guard against providers or redirects that set sessionId to the literal string "undefined"
  const sessionId = rawSessionId && rawSessionId !== 'undefined' ? rawSessionId : null;
  const errorParam = searchParams.get('error');

  useEffect(() => {
    if (rawSessionId === 'undefined') {
      console.warn('[PaymentsPage] Ignoring invalid sessionId=undefined from URL');
      setError('❌ Invalid payment session (undefined ID). Please try creating a new payment.');
    }
  }, [rawSessionId]);

  useEffect(() => {
    if (errorParam === 'missing_session') {
      console.error('[PaymentsPage] Backend returned error: payment session not found');
      setError('❌ Payment session not found or expired. Please try again or contact support.');
    }
  }, [errorParam]);

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: '$19.99',
      priceInCents: 1999,
      description: 'Perfect for casual dating',
      features: [
        '✓ Unlimited likes',
        '✓ See who likes you',
        '✓ Unlimited messages',
        '✓ Online status indicator'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '$49.99',
      priceInCents: 4999,
      description: 'Our most popular plan',
      features: [
        '✓ All Basic features',
        '✓ Advanced filters',
        '✓ See message read status',
        '✓ Boost your profile for 1 day',
        '✓ 30-day subscription'
      ],
      recommended: true
    },
    {
      id: 'platinum',
      name: 'Platinum',
      price: '$99.99',
      priceInCents: 9999,
      description: 'For serious daters',
      features: [
        '✓ All Premium features',
        '✓ See who visited your profile',
        '✓ Unlimited boosts',
        '✓ Priority support',
        '✓ 30-day subscription'
      ]
    }
  ];

  useEffect(() => {
    if (sessionId) {
      checkPaymentStatus();
    }
  }, [sessionId]);

  const checkPaymentStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/payments/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.payment?.status === 'succeeded') {
        setSuccessMessage('✅ Payment successful! Your subscription is now active.');
        setTimeout(() => {
          navigate('/matches');
        }, 3000);
      }
    } catch (err) {
      console.error('Error checking payment status:', err);
    }
  };

  const handlePaymentClick = async (planId) => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      console.log('[PaymentsPage] Creating payment session for plan:', planId);
      console.log('[PaymentsPage] API URL:', API_URL);

      const response = await axios.post(`${API_URL}/payments/create-session`, {
        planId,
        provider: 'paychangu'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('[PaymentsPage] Backend response:', response.data);
      const { checkoutUrl, paymentId } = response.data;

      if (!checkoutUrl) {
        console.error('[PaymentsPage] No checkoutUrl in response:', response.data);
        setError('Failed to create checkout session. Please try again.');
        return;
      }

      if (!paymentId || paymentId === 'undefined') {
        console.error('[PaymentsPage] CRITICAL: paymentId is missing or undefined!', { checkoutUrl, paymentId });
        setError('Payment session creation failed. Please contact support.');
        return;
      }

      console.log('[PaymentsPage] Redirecting to checkout:', { checkoutUrl, paymentId });
      // Redirect to provider checkout
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error('[PaymentsPage] Payment error:', err.response?.status, err.response?.data || err.message);
      if (err.response?.status === 403) {
        setError('⚠️ Please complete at least 50% of your profile before making a payment.');
        setTimeout(() => navigate('/profile'), 2000);
      } else {
        setError(err.response?.data?.error || 'Payment failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (successMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-orange-50 flex items-center justify-center p-4 pb-24">
        <div className="card text-center max-w-md">
          <FaCheckCircle className="text-green-500 text-5xl mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Payment Successful!</h2>
          <p className="text-gray-600 mb-6">{successMessage}</p>
          <p className="text-sm text-gray-500">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-orange-50 p-4 pb-24">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 mt-4">
            <button
              onClick={() => navigate('/profile')}
              className="text-pink-500 hover:text-pink-600 transition p-2 rounded-lg hover:bg-pink-100"
              title="Back"
            >
              <FaArrowLeft size={24} />
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Premium Plans</h1>
            <div className="w-10"></div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <FaTimesCircle className="text-red-500 text-xl mt-0.5 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Plans Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {plans.map(plan => (
              <div
                key={plan.id}
                className={`card transition-all ${
                  plan.recommended
                    ? 'ring-2 ring-pink-500 transform scale-105'
                    : ''
                }`}
              >
                {plan.recommended && (
                  <div className="bg-gradient-to-r from-pink-500 to-orange-500 text-white py-2 px-4 rounded-t-xl -mx-6 mb-6 font-semibold text-center">
                    🌟 RECOMMENDED
                  </div>
                )}

                <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-pink-600">{plan.price}</span>
                  <span className="text-gray-600 text-sm">/month</span>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="text-gray-700 text-sm">
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePaymentClick(plan.id)}
                  disabled={loading}
                  className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${
                    plan.recommended
                      ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white hover:shadow-lg'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <FaCreditCard size={18} />
                  {loading ? 'Processing...' : 'Choose Plan'}
                </button>
              </div>
            ))}
          </div>

          {/* Info Box */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-pink-500">
            <h3 className="font-semibold text-gray-800 mb-3">💳 Payment Info</h3>
            <ul className="text-gray-600 text-sm space-y-2">
              <li>✓ Secure payments powered by Paychangu</li>
              <li>✓ All major payment methods accepted</li>
              <li>✓ Automatic subscription renewal (cancel anytime)</li>
              <li>✓ 24/7 customer support available</li>
            </ul>
          </div>
        </div>
      </div>

      <BottomNavBar user={user} />
    </>
  );
}






