import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHeart, FaTimes } from 'react-icons/fa';
import BottomNavBar from '../components/BottomNavBar';

const API_URL = process.env.REACT_APP_API_URL;

function LikesPage({ user }) {
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchLikes();
  }, []);

  const fetchLikes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/matches/likes`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setLikes(response.data.likes || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load likes');
      console.error('Error fetching likes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLikeBack = async (likeId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/matches/like-back/${likeId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Remove from likes list
      setLikes(likes.filter(l => l._id !== likeId));
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error liking back');
    }
  };

  const handlePass = async (likeId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/matches/pass-like/${likeId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Remove from likes list
      setLikes(likes.filter(l => l._id !== likeId));
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error passing');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading likes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-orange-50 pb-24">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 mt-4">
          <button
            onClick={() => navigate('/discover')}
            className="text-pink-500 hover:text-pink-600"
          >
            <FaArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <FaHeart className="text-red-500" /> Likes You Got
          </h1>
          <div className="w-6"></div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Likes List */}
        {likes.length === 0 ? (
          <div className="card text-center max-w-md mx-auto">
            <FaHeart size={48} className="text-pink-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-4">No likes yet</p>
            <p className="text-gray-500 mb-6">Keep swiping to get likes from other users!</p>
            <button
              onClick={() => navigate('/discover')}
              className="btn-primary"
            >
              Start Discovering
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {likes.map((like) => (
              <div key={like._id} className="card overflow-hidden hover:shadow-xl transition">
                {/* Photo */}
                <div className="relative mb-4 bg-gray-200 rounded-lg overflow-hidden h-64">
                  {like.user?.photos && like.user.photos.length > 0 ? (
                    <img
                      src={like.user.photos[0].url}
                      alt={like.user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No photo
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    ❤️ Likes You
                  </div>
                </div>

                {/* Info */}
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {like.user?.nickname || like.user?.name}
                </h3>

                {like.user?.university && (
                  <p className="text-gray-600 mb-1">{like.user.university}</p>
                )}

                {like.user?.course && (
                  <p className="text-gray-500 text-sm mb-2">{like.user.course}</p>
                )}

                {/* Match Score */}
                {like.matchScore && (
                  <div className="mb-4 p-2 bg-pink-50 rounded-lg">
                    <p className="text-sm text-pink-700">
                      <strong>Compatibility: {like.matchScore.score}%</strong>
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleLikeBack(like._id)}
                    className="flex-1 btn-primary flex items-center justify-center gap-2"
                  >
                    <FaHeart /> Like Back
                  </button>
                  <button
                    onClick={() => handlePass(like._id)}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition flex items-center justify-center gap-2"
                  >
                    <FaTimes /> Pass
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNavBar />
    </div>
  );
}

export default LikesPage;
