import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEye, FaCalendarAlt } from 'react-icons/fa';
import BottomNavBar from '../components/BottomNavBar';
import getImageUrl from '../utils/imageUrl';

const API_URL = process.env.REACT_APP_API_URL || 'https://edulove-backend.onrender.com/api';

function ProfileViewsPage({ user }) {
  const [viewers, setViewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageErrors, setImageErrors] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfileViewers();
  }, []);

  const fetchProfileViewers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/users/me/profile-viewers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setViewers(response.data.viewers || []);
    } catch (err) {
      console.error('Error fetching profile viewers:', err);
      setError(err.response?.data?.error || 'Failed to load profile viewers');
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = (userId) => {
    setImageErrors(prev => ({ ...prev, [userId]: true }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile viewers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={() => navigate('/profile')}
                className="text-blue-500 hover:text-blue-600 transition p-2 rounded-lg hover:bg-blue-100"
                title="Back"
              >
                <FaArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <FaEye className="text-blue-500" />
                  Profile Views
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {viewers.length} {viewers.length === 1 ? 'person has' : 'people have'} viewed your profile
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Viewers List */}
        <div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg m-3 md:m-4 text-sm">
              {error}
            </div>
          )}

          {viewers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <FaEye className="text-4xl text-gray-300 mb-4" />
              <p className="text-gray-500 text-center">
                No one has viewed your profile yet. Make your profile interesting to attract viewers!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {viewers.map((viewer) => (
                <button
                  key={viewer._id}
                  onClick={() => navigate(`/profile/${viewer._id}`)}
                  className="w-full bg-white hover:bg-gray-50 p-4 text-left transition border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0 w-16 h-16">
                      {viewer.photo && !imageErrors[viewer._id] ? (
                        <img
                          src={getImageUrl(viewer.photo)}
                          alt={viewer.name}
                          className="w-16 h-16 rounded-full object-cover bg-gray-200"
                          onError={() => handleImageError(viewer._id)}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
                          {(viewer.name || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {viewer.nickname || viewer.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        {viewer.age && <span>{viewer.age} years old</span>}
                        {viewer.age && viewer.university && <span>•</span>}
                        {viewer.university && <span>{viewer.university}</span>}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                        <FaCalendarAlt size={12} />
                        <span>{formatDate(viewer.viewedAt)}</span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="text-blue-500 flex-shrink-0">
                      <span className="text-lg">→</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNavBar user={user} />
    </div>
  );
}

function formatDate(date) {
  const now = new Date();
  const viewDate = new Date(date);
  const diffMs = now - viewDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return viewDate.toLocaleDateString();
}

export default ProfileViewsPage;
