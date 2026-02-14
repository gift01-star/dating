import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'https://frontend-i89x.onrender.com/api';

export default function PasswordResetRequestPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/request-reset`, { email });
      setMessage(res.data.message || 'If an account exists, a reset link has been created.');
      if (res.data.resetLink) {
        setMessage((prev) => `${prev}\nReset link: ${res.data.resetLink}`);
      }
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not create reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-header flex items-center justify-center p-4">
      <div className="w-full max-w-md card">
        <h1 className="text-2xl font-bold mb-4">Reset Password</h1>
        <p className="text-sm text-gray-600 mb-4">Enter your account email and we'll create a reset link (dev: shown here).</p>

        {message && (
          <div className="p-3 mb-4 bg-blue-50 text-blue-800 rounded whitespace-pre-wrap">{message}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="your@email.com"
          />

          <div className="flex gap-2">
            <button disabled={loading} className="btn-primary flex-1" type="submit">{loading ? 'Processing...' : 'Create Reset Link'}</button>
            <button type="button" onClick={() => navigate('/login')} className="btn-outline">Back</button>
          </div>
        </form>
      </div>
    </div>
  );
}