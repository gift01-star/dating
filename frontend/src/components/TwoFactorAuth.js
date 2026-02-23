import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaShieldAlt, FaCheck, FaTimes, FaCopy } from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || 'https://edulove-backend.onrender.com/api';

function TwoFactorAuth({ user }) {
  const [twoFAEnabled, setTwoFAEnabled] = useState(user?.twoFactorEnabled || false);
  const [setupStep, setSetupStep] = useState(0); // 0: off, 1: scanning, 2: backup codes
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [password, setPassword] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    const checkTwoFAStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/auth/2fa/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTwoFAEnabled(response.data.twoFactorEnabled);
      } catch (err) {
        console.error('Error checking 2FA status:', err);
      }
    };

    checkTwoFAStatus();
  }, []);

  const handleSetupClick = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/auth/2fa/setup`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSecret(response.data.secret);
      setQrCode(response.data.qrCode);
      setBackupCodes(response.data.backupCodes);
      setSetupStep(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6 || !/^\d+$/.test(code)) {
      setError('Please enter a 6-digit code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/auth/2fa/enable`, {
        secret,
        code,
        backupCodes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSetupStep(2); // Show backup codes
      setSuccess('2FA enabled successfully!');
      setCode('');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!password) {
      setError('Enter your password to disable 2FA');
      return;
    }

    if (!window.confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      return;
    }

    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/auth/2fa/disable`, {
        password
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setTwoFAEnabled(false);
      setSetupStep(0);
      setPassword('');
      setSuccess('2FA disabled');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const handleCancelSetup = () => {
    setSetupStep(0);
    setCode('');
    setError('');
    setSecret('');
    setQrCode('');
    setBackupCodes([]);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6 border-l-4 border-blue-500">
      <div className="flex items-center gap-3 mb-4">
        <FaShieldAlt className="text-blue-500 text-2xl" />
        <h3 className="text-xl font-bold text-gray-800">Two-Factor Authentication (2FA)</h3>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 text-sm">
          {success}
        </div>
      )}

      {twoFAEnabled && setupStep === 0 && (
        <div>
          <p className="text-gray-600 mb-4 flex items-center gap-2">
            <FaCheck className="text-green-500" />
            2FA is enabled on your account
          </p>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Your account is protected with two-factor authentication. You'll need your authenticator app to log in.
            </p>
            <button
              onClick={() => setSetupStep(3)}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded transition"
              disabled={loading}
            >
              Disable 2FA
            </button>
          </div>
        </div>
      )}

      {!twoFAEnabled && setupStep === 0 && (
        <div>
          <p className="text-gray-600 mb-4 flex items-center gap-2">
            <FaTimes className="text-gray-400" />
            2FA is not enabled
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Add an extra layer of security to your account by enabling two-factor authentication. You'll need an authenticator app like Google Authenticator or Authy.
          </p>
          <button
            onClick={handleSetupClick}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded transition"
            disabled={loading}
          >
            {loading ? 'Setting up...' : 'Enable 2FA'}
          </button>
        </div>
      )}

      {setupStep === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.):
          </p>
          <div className="flex justify-center">
            {qrCode && <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 border-2 border-blue-200 p-2 rounded" />}
          </div>
          <p className="text-sm text-gray-600 text-center">
            Or enter this secret manually: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{secret}</code>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter the 6-digit code from your app:
            </label>
            <input
              type="text"
              maxLength="6"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl letter-spacing"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleVerifyCode}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded transition"
              disabled={loading || code.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify & Enable'}
            </button>
            <button
              onClick={handleCancelSetup}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {setupStep === 2 && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded">
            <p className="text-sm font-semibold text-blue-900 mb-2">Save your backup codes</p>
            <p className="text-sm text-blue-800 mb-4">
              Store these codes in a safe place. You can use them to access your account if you lose access to your authenticator app.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, idx) => (
                <div
                  key={idx}
                  onClick={() => handleCopyCode(code)}
                  className="bg-white p-2 rounded border border-blue-200 cursor-pointer hover:bg-blue-100 transition text-sm font-mono flex items-center justify-between"
                >
                  <span>{code}</span>
                  {copiedCode === code && <FaCheck className="text-green-500 text-xs" />}
                  {copiedCode !== code && <FaCopy className="text-gray-400 text-xs" />}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              setSetupStep(0);
              setTwoFAEnabled(true);
            }}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded transition"
          >
            Done
          </button>
        </div>
      )}

      {setupStep === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter your password to disable 2FA:
          </p>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <div className="flex gap-3">
            <button
              onClick={handleDisable}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded transition"
              disabled={loading}
            >
              {loading ? 'Disabling...' : 'Disable 2FA'}
            </button>
            <button
              onClick={() => {
                setSetupStep(0);
                setPassword('');
              }}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TwoFactorAuth;
