import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaHeart, FaStar } from 'react-icons/fa';
import BottomNavBar from '../components/BottomNavBar';
import getImageUrl from '../utils/imageUrl';

const API_URL = process.env.REACT_APP_API_URL || 'https://edulove-backend.onrender.com/api';

function FavoritesPage({ user }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageErrors, setImageErrors] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/users/me/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFavorites(response.data.favorites || []);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setError(err.response?.data?.error || 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/users/favorites/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFavorites(favorites.filter(fav => fav._id !== userId));
    } catch (err) {
      console.error('Error removing favorite:', err);
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
          <p className="text-gray-600">Loading favorites...</p>
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
                onClick={() => navigate('/discover')}
                className="text-blue-500 hover:text-blue-600 transition p-2 rounded-lg hover:bg-blue-100"
                title="Back"
              >
                <FaArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <FaStar className="text-yellow-500" />
                  My Favorites
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {favorites.length} bookmarked {favorites.length === 1 ? 'profile' : 'profiles'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Favorites List */}
        <div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg m-3 md:m-4 text-sm">
              {error}
            </div>
          )}

          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <FaStar className="text-4xl text-gray-300 mb-4" />
              <p className="text-gray-500 text-center">
                You haven't bookmarked any profiles yet. Start adding your favorites!
              </p>
              <button
                onClick={() => navigate('/discover')}
                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition"
              >
                Explore Profiles
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-3 md:p-4">
              {favorites.map((favorite) => (
                <div key={favorite._id} className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden">
                  {/* Profile Image */}
                  <div className="relative h-64 bg-gray-200">
                    {favorite.photos && favorite.photos.length > 0 && !imageErrors[favorite._id] ? (
                      <img
                        src={getImageUrl(favorite.photos[0].url)}
                        alt={favorite.name}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => navigate(`/profile/${favorite._id}`)}
                        onError={() => handleImageError(favorite._id)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 text-white text-4xl font-bold">
                        {(favorite.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <button
                      onClick={() => handleRemoveFavorite(favorite._id)}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition shadow-lg"
                      title="Remove from favorites"
                    >
                      <FaHeart size={16} />
                    </button>
                  </div>

                  {/* Profile Info */}
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                      {favorite.nickname || favorite.name}
                    </h3>
                    <div className="text-sm text-gray-600 mb-2">
                      {favorite.age && <span>{favorite.age} years old</span>}
                      {favorite.age && favorite.gender && <span> • {favorite.gender}</span>}
                    </div>
                    {favorite.university && (
                      <p className="text-sm text-gray-500 mb-3">{favorite.university}</p>
                    )}
                    <button
                      onClick={() => navigate(`/profile/${favorite._id}`)}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded transition"
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNavBar user={user} />
    </div>
  );
}

export default FavoritesPage;
