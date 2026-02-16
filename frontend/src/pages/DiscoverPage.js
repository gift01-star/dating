import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaHeart, FaTimes, FaArrowLeft, FaComments } from 'react-icons/fa';
import BottomNavBar from '../components/BottomNavBar';
import getImageUrl from '../utils/imageUrl';

const API_URL = process.env.REACT_APP_API_URL || 'https://edulove-backend.onrender.com/api';

// Helper to format last active time
const formatLastActive = (lastActive) => {
  if (!lastActive) return 'Just now';
  
  const date = new Date(lastActive);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

function DiscoverPage({ user }) {
  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0); // Track which photo to display
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState(false);
  const [filters, setFilters] = useState({
    gender: '',
    university: '',
    location: '',
    minAge: '',
    maxAge: '',
    minHeight: '',
    maxHeight: '',
    relationship: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfiles();
  }, [filters]);

  const handleForbiddenRedirect = (err) => {
    const msg = err.response?.data?.error || '';
    const profileCompletion = err.response?.data?.profileCompletion;
    const required = err.response?.data?.required;
    
    if (err.response?.status === 403 && msg.toLowerCase().includes('complete')) {
      // Show alert with profile completion info
      if (profileCompletion !== undefined && required !== undefined) {
        alert(`⚠️ Profile Incomplete\n\nYour profile is ${profileCompletion}% complete.\nYou need at least ${required}% to use this feature.\n\nPlease complete your profile first.`);
      } else {
        alert(msg);
      }
      navigate('/profile');
      return true;
    }
    return false;
  };

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const query = new URLSearchParams();

      if (filters.gender) query.append('gender', filters.gender);
      if (filters.university) query.append('university', filters.university);
      if (filters.minAge) query.append('minAge', filters.minAge);
      if (filters.maxAge) query.append('maxAge', filters.maxAge);
      if (filters.relationship) query.append('relationship', filters.relationship);

      const response = await axios.get(`${API_URL}/users/discover?${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setProfiles(response.data.users);
      setCurrentIndex(0);
      setError('');
    } catch (err) {
      if (handleForbiddenRedirect(err)) return;
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
      setPhotoIndex(0); // Reset to first photo for new profile
      setImageError(false);
    } catch (err) {
      if (!handleForbiddenRedirect(err)) setError(err.response?.data?.error || 'Error liking profile');
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
      setPhotoIndex(0); // Reset to first photo for new profile
      setImageError(false);
    } catch (err) {
      if (!handleForbiddenRedirect(err)) setError(err.response?.data?.error || 'Error passing profile');
    }
  };

  const handleNavigateToChat = async () => {
    if (currentIndex >= profiles.length) return;

    try {
      const token = localStorage.getItem('token');
      const profile = profiles[currentIndex];

      // Try to find existing match
      try {
        const matchResponse = await axios.get(`${API_URL}/matches`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // matchResponse.data is an array of matches
        const matches = Array.isArray(matchResponse.data) ? matchResponse.data : matchResponse.data.matches || [];
        const existingMatch = matches.find(m => 
          (String(m.user?._id) === profile._id) ||
          (String(m._id) === profile._id) // fallback
        );

        if (existingMatch) {
          navigate(`/chat/${existingMatch._id}`);
          return;
        }
      } catch (err) {
        console.error('Error checking for existing match:', err);
        // Continue to create new match if checking fails
      }

      // Try to like/create match
      try {
        console.log('[DiscoverPage] Creating match with profile:', profile._id);
        const likeResponse = await axios.post(`${API_URL}/matches/like/${profile._id}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const matchId = likeResponse.data.match?._id;
        console.log('[DiscoverPage] Match created successfully:', matchId);
        if (matchId) {
          navigate(`/chat/${matchId}`);
        } else {
          console.error('[DiscoverPage] No matchId in response:', likeResponse.data);
          setError('Failed to create match. Try again.');
        }
      } catch (err) {
        console.error('[DiscoverPage] Error creating match:', err.response?.status, err.response?.data);
        // Handle case where user already liked/matched
        if (err.response?.status === 400 && err.response?.data?.error?.includes('Already')) {
          // This user was already matched - try to find the match
          try {
            const matchResponse = await axios.get(`${API_URL}/matches`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const matches = Array.isArray(matchResponse.data) ? matchResponse.data : matchResponse.data.matches || [];
            const match = matches.find(m => String(m.user?._id) === profile._id);
            if (match) {
              navigate(`/chat/${match._id}`);
              return;
            }
          } catch (e) {
            console.error('Error finding existing match:', e);
          }
          setError('You already matched with this user. Check your messages!');
        } else if (!handleForbiddenRedirect(err)) {
          setError(err.response?.data?.error || 'Error creating match');
        }
      }
    } catch (err) {
      console.error('Error in handleNavigateToChat:', err);
      setError('Something went wrong. Try again.');
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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-orange-50 p-3 md:p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 md:mb-6 gap-2">
          <button
            onClick={() => navigate('/matches')}
            className="text-pink-500 hover:text-pink-600 transition p-2 rounded-lg hover:bg-pink-100 flex-shrink-0"
            title="View matches"
          >
            <FaArrowLeft size={24} />
          </button>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">EduLove</h1>
          <button
            onClick={() => navigate('/profile')}
            className="text-pink-500 hover:text-pink-600 transition px-3 py-2 rounded-lg hover:bg-pink-100 text-sm md:text-base font-medium flex-shrink-0"
            title="Go to profile"
          >
            👤 Profile
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-3 md:p-4 mb-4 md:mb-6 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm md:text-base">Filters</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
            
            
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
              value={filters.relationship}
              onChange={(e) => setFilters({ ...filters, relationship: e.target.value })}
              className="input-field text-sm"
            >
              <option value="">Any Goal</option>
              <option value="Dating">Dating</option>
              <option value="Hookup">Hookup</option>
              <option value="Friendship">Friendship</option>
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
            
            
          </div>
        </div>

        {/* Profile Card */}
        {currentProfile && (
          <div className="card overflow-hidden mb-6">
            {/* Photos Carousel */}
            <div className="relative mb-4 bg-gray-300 rounded-lg overflow-hidden h-96">
              {currentProfile.photos && currentProfile.photos.length > 0 && !imageError ? (
                <>
                  <img
                    src={getImageUrl(currentProfile.photos[photoIndex]?.url || currentProfile.photos[0]?.url)}
                    alt={currentProfile.name}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                  {/* Previous Photo Button */}
                  {currentProfile.photos.length > 1 && photoIndex > 0 && (
                    <button
                      onClick={() => setPhotoIndex(prev => Math.max(0, prev - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition"
                    >
                      ◀
                    </button>
                  )}
                  {/* Next Photo Button */}
                  {currentProfile.photos.length > 1 && photoIndex < currentProfile.photos.length - 1 && (
                    <button
                      onClick={() => setPhotoIndex(prev => Math.min(currentProfile.photos.length - 1, prev + 1))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition"
                    >
                      ▶
                    </button>
                  )}
                  {currentProfile.photos.length > 1 && (
                    <div className="absolute top-3 right-3 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                      {photoIndex + 1}/{currentProfile.photos.length}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gradient-to-br from-gray-300 to-gray-400">
                  📷 {imageError ? 'Photo failed to load' : 'No photo uploaded yet'}
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
                  <p className={`text-sm font-medium mt-1 ${currentProfile.isOnline ? 'text-green-600' : 'text-gray-500'}`}>
                    {currentProfile.isOnline ? '🟢 Online' : '⚪ Offline'}
                  </p>
                  {!currentProfile.isOnline && currentProfile.lastActive && (
                    <p className="text-xs text-gray-500 mt-1">
                      Last active {formatLastActive(currentProfile.lastActive)}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {currentProfile.verified && (
                    <span className="text-blue-600 text-xl">✓ Verified</span>
                  )}
                  {currentProfile.isOnline && (
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      🟢 Online
                    </span>
                  )}
                </div>
              </div>

              {currentProfile.location && (
                <p className="text-gray-600 mb-2">📍 {currentProfile.location}</p>
              )}

              {currentProfile.university && (
                <p className="text-gray-600 mb-1">
                  🎓 {currentProfile.university}
                </p>
              )}

              {currentProfile.relationshipGoal && (
                <p className="text-sm text-indigo-700 font-medium mb-1">• {currentProfile.relationshipGoal}</p>
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
            onClick={handleNavigateToChat}
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
      </div>

      <BottomNavBar user={user} />
    </div>
  );
}

export default DiscoverPage;
