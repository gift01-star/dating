import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaHeart, FaTimes, FaArrowLeft, FaComments } from 'react-icons/fa';
import BottomNavBar from '../components/BottomNavBar';

const API_URL = process.env.REACT_APP_API_URL;

function DiscoverPage({ user }) {
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    gender: '',
    university: '',
    location: '',
    minAge: '',
    maxAge: '',
    minHeight: '',
    maxHeight: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfiles();
  }, [filters]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const query = new URLSearchParams();

      if (filters.gender) query.append('gender', filters.gender);
      if (filters.university) query.append('university', filters.university);
      if (filters.minAge) query.append('minAge', filters.minAge);
      if (filters.maxAge) query.append('maxAge', filters.maxAge);

      const response = await axios.get(`${API_URL}/users/discover?${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setProfiles(response.data.users);
      setCurrentIndex(0);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (currentIndex >= profiles.length) return;

    try {
      const token = localStorage.getItem('token');
      const profile = profiles[currentIndex];

      await axios.post(`${API_URL}/matches/like/${profile._id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCurrentIndex(prev => prev + 1);
    } catch (err) {
      setError(err.response?.data?.error || 'Error liking profile');
    }
  };

  const handlePass = async () => {
    if (currentIndex >= profiles.length) return;

    try {
      const token = localStorage.getItem('token');
      const profile = profiles[currentIndex];

      await axios.post(`${API_URL}/matches/pass/${profile._id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCurrentIndex(prev => prev + 1);
    } catch (err) {
      setError(err.response?.data?.error || 'Error passing profile');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (currentIndex >= profiles.length) {
    return (
      <div className="min-h-screen gradient-header flex items-center justify-center">
        <div className="card text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No more profiles</h2>
          <p className="text-gray-600 mb-6">Come back later for more matches!</p>
          <button
            onClick={() => navigate('/matches')}
            className="btn-primary"
          >
            View Matches
          </button>
        </div>
      </div>
    );
  }

  const currentProfile = profiles[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-orange-50 p-4 pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate('/matches')}
            className="text-pink-500 hover:text-pink-600"
          >
            <FaArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">EduLove</h1>
          <button
            onClick={() => navigate('/profile')}
            className="text-pink-500 hover:text-pink-600"
          >
            Profile
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3">Filters</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="University"
              value={filters.university}
              onChange={(e) => setFilters({ ...filters, university: e.target.value })}
              className="input-field text-sm"
            />
            <input
              type="text"
              placeholder="Location"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="input-field text-sm"
            />
            <select
              value={filters.gender}
              onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
              className="input-field text-sm"
            >
              <option value="">Any Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <select
              value={filters.minAge}
              onChange={(e) => setFilters({ ...filters, minAge: e.target.value })}
              className="input-field text-sm"
            >
              <option value="">Min Age</option>
              <option value="18">18+</option>
              <option value="20">20+</option>
              <option value="22">22+</option>
              <option value="25">25+</option>
            </select>
            <input
              type="number"
              placeholder="Min Height (cm)"
              value={filters.minHeight}
              onChange={(e) => setFilters({ ...filters, minHeight: e.target.value })}
              className="input-field text-sm"
            />
            <input
              type="number"
              placeholder="Max Height (cm)"
              value={filters.maxHeight}
              onChange={(e) => setFilters({ ...filters, maxHeight: e.target.value })}
              className="input-field text-sm"
            />
          </div>
        </div>

        {/* Profile Card */}
        {currentProfile && (
          <div className="card overflow-hidden mb-6">
            {/* Photos Carousel */}
            <div className="relative mb-4 bg-gray-200 rounded-lg overflow-hidden h-96">
              {currentProfile.photos && currentProfile.photos.length > 0 ? (
                <>
                  <img
                    src={currentProfile.photos[0].url}
                    alt={currentProfile.name}
                    className="w-full h-full object-cover"
                  />
                  {currentProfile.photos.length > 1 && (
                    <div className="absolute top-3 right-3 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                      1/{currentProfile.photos.length}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  📷 No photo uploaded yet
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {currentProfile.nickname || currentProfile.name}
                  </h2>
                  <p className="text-gray-600 text-lg font-semibold">
                    {currentProfile.gender}{currentProfile.height && `, ${currentProfile.height}cm`}
                  </p>
                </div>
                {currentProfile.verified && (
                  <span className="text-blue-600 text-xl">✓ Verified</span>
                )}
              </div>

              {currentProfile.location && (
                <p className="text-gray-600 mb-2">📍 {currentProfile.location}</p>
              )}

              {currentProfile.university && (
                <p className="text-gray-600 mb-1">
                  🎓 {currentProfile.university}
                </p>
              )}

              {currentProfile.course && (
                <p className="text-gray-600 mb-3">
                  📚 {currentProfile.course}{currentProfile.year && ` (${currentProfile.year})`}
                </p>
              )}

              {currentProfile.bio && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-700 text-sm italic">"{currentProfile.bio}"</p>
                </div>
              )}

              {currentProfile.interests && currentProfile.interests.length > 0 && (
                <div className="mb-4">
                  <p className="text-gray-600 font-medium mb-2">Interests:</p>
                  <div className="flex flex-wrap gap-2">
                    {currentProfile.interests.map((interest, idx) => (
                      <span
                        key={idx}
                        className="bg-pink-100 text-pink-600 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {currentProfile.bio && (
                <p className="text-gray-700 mb-4">{currentProfile.bio}</p>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={handlePass}
            className="w-16 h-16 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition flex items-center justify-center"
          >
            <FaTimes size={24} />
          </button>
          <button
            onClick={handleLike}
            className="w-16 h-16 rounded-full bg-pink-500 text-white hover:bg-pink-600 transition flex items-center justify-center shadow-lg"
          >
            <FaHeart size={24} />
          </button>
          <button
            onClick={() => navigate(`/chat/${currentProfile._id}`)}
            className="w-16 h-16 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition flex items-center justify-center shadow-lg"
            title="Send Message"
          >
            <FaComments size={24} />
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
            {error}
          </div>
        )}

        <p className="text-center text-gray-600 text-sm mt-4">
          {currentIndex + 1} / {profiles.length}
        </p>
      </div>

      <BottomNavBar />
    </div>
  );
}

export default DiscoverPage;
