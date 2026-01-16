import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaComments } from 'react-icons/fa';
import BottomNavBar from '../components/BottomNavBar';

const API_URL = process.env.REACT_APP_API_URL;

function MatchesPage({ user }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMatches();
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
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-orange-50 p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 mt-4">
          <button
            onClick={() => navigate('/discover')}
            className="text-pink-500 hover:text-pink-600"
          >
            <FaArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Matches</h1>
          <button
            onClick={() => navigate('/profile')}
            className="text-pink-500 hover:text-pink-600 text-2xl"
          >
            👤
          </button>
        </div>

        {/* Matches List */}
        {matches.length === 0 ? (
          <div className="card text-center">
            <p className="text-gray-600 text-lg mb-4">No matches yet</p>
            <p className="text-gray-500 mb-6">Start swiping to find your match!</p>
            <button
              onClick={() => navigate('/discover')}
              className="btn-primary"
            >
              Start Discovering
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {matches.map((match) => (
              <div key={match._id} className="card overflow-hidden hover:shadow-xl transition">
                {/* Photo */}
                <div className="relative mb-4 bg-gray-200 rounded-lg overflow-hidden h-64">
                  {match.user.photos && match.user.photos.length > 0 ? (
                    <img
                      src={match.user.photos[0].url}
                      alt={match.user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No photo
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

                {/* Message Button */}
                <button
                  onClick={() => navigate(`/chat/${match._id}`)}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  <FaComments /> Send Message
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      <BottomNavBar />
    </>
  );
}

export default MatchesPage;
