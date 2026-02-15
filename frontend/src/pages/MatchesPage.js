import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaComments } from 'react-icons/fa';
import BottomNavBar from '../components/BottomNavBar';
import getImageUrl from '../utils/imageUrl';

const API_URL = process.env.REACT_APP_API_URL || 'https://edulove-backend.onrender.com/api';

function MatchesPage({ user }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState({});
  const navigate = useNavigate();

  // Local blocked state to reflect unblock actions immediately
  const [localBlocked, setLocalBlocked] = useState(user?.blocked || []);

  useEffect(() => {
    setLocalBlocked(user?.blocked || []);
  }, [user]);

  const handleImageError = (userId) => {
    setImageErrors(prev => ({ ...prev, [userId]: true }));
  };

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 5000); // refresh matches so new conversations/matches show up
    return () => clearInterval(interval);
  }, []);

  const fetchMatches = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/matches`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMatches(response.data);
    } catch (err) {
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-orange-50 p-3 md:p-4 pb-24">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 md:mb-8 mt-2 md:mt-4 gap-2">
            <button
              onClick={() => navigate('/discover')}
              className="text-pink-500 hover:text-pink-600 transition p-2 rounded-lg hover:bg-pink-100 flex-shrink-0"
              title="Back"
            >
              <FaArrowLeft size={24} />
            </button>
            <h1 className="text-xl md:text-3xl font-bold text-gray-800 flex-1">Matches</h1>
            <button
              onClick={() => navigate('/profile')}
              className="text-pink-500 hover:text-pink-600 transition px-3 py-2 rounded-lg hover:bg-pink-100 flex-shrink-0 text-sm md:text-base font-medium"
              title="View profile"
            >
              👤
            </button>
          </div>

          {/* Matches List */}
          {matches.length === 0 ? (
            <div className="card text-center">
              <p className="text-gray-600 text-base md:text-lg mb-4">No matches yet</p>
              <p className="text-gray-500 mb-6 text-sm md:text-base">Start swiping to find your match!</p>
              <button
                onClick={() => navigate('/discover')}
                className="btn-primary"
              >
                Start Discovering
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {matches.map((match) => (
              <div key={match._id} className="card overflow-hidden hover:shadow-xl transition">
                {/* Photo */}
                <div className="relative mb-4 bg-gray-300 rounded-lg overflow-hidden h-64">
                  {match.user.photos && match.user.photos.length > 0 && !imageErrors[match.user._id] ? (
                    <img
                      src={getImageUrl(match.user.photos[0].url)}
                      alt={match.user.name}
                      className="w-full h-full object-cover"
                      onError={() => handleImageError(match.user._id)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gradient-to-br from-gray-300 to-gray-400">
                      📷 {imageErrors[match.user._id] ? 'Photo failed to load' : 'No photo'}
                    </div>
                  )}
                  {match.user.isOnline && (
                    <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      🟢 Online
                    </div>
                  )}
                </div>

                {/* Info */}
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {match.user.nickname || match.user.name}
                </h3>

                {match.user.university && (
                  <p className="text-gray-600 mb-1">{match.user.university}</p>
                )}

                {match.user.course && (
                  <p className="text-gray-500 text-sm mb-4">{match.user.course}</p>
                )}

                {/* Message / Unblock Button */}
                {localBlocked && localBlocked.some(id => String(id) === String(match.user._id)) ? (
                  <button
                    onClick={async () => {
                      const confirmUnblock = window.confirm('Unblock this user? They will be able to message you again.');
                      if (!confirmUnblock) return;

                      try {
                        const token = localStorage.getItem('token');
                        await axios.post(`${API_URL}/users/unblock/${match.user._id}`, {}, {
                          headers: { Authorization: `Bearer ${token}` }
                        });

                        setLocalBlocked(localBlocked.filter(id => String(id) !== String(match.user._id)));
                        alert('User unblocked. You can now send messages.');
                      } catch (err) {
                        console.error('Error unblocking user:', err);
                        alert('Could not unblock user. Please try again.');
                      }
                    }}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded"
                  >
                    Unblock
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/chat/${match._id}`)}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    <FaComments /> Send Message
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      <BottomNavBar user={user} />
    </>
  );
}

export default MatchesPage;
