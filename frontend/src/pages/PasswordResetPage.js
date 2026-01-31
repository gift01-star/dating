import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL;

export default function PasswordResetPage() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    if (password.length < 6 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setMessage('Password must be at least 6 characters and include letters and numbers');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API_URL}/auth/reset`, { token, newPassword: password });
      setMessage('Password reset successful — redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-header flex items-center justify-center p-4">
      <div className="w-full max-w-md card">
        <h1 className="text-2xl font-bold mb-4">Set a new password</h1>

        {message && (
          <div className="p-3 mb-4 bg-blue-50 text-blue-800 rounded">{message}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="New password"
          />

          <input
            type="password"
            className="input-field"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirm new password"
          />

          <div className="flex gap-2">
            <button disabled={loading} className="btn-primary flex-1" type="submit">{loading ? 'Processing...' : 'Set Password'}</button>
            <button type="button" onClick={() => navigate('/login')} className="btn-outline">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}