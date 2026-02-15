import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaComments, FaSearch } from 'react-icons/fa';
import BottomNavBar from '../components/BottomNavBar';
import getImageUrl from '../utils/imageUrl';

const API_URL = process.env.REACT_APP_API_URL || 'https://edulove-backend.onrender.com/api';

function MessagesPage({ user }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [imageErrors, setImageErrors] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000); // refresh conversations periodically
    return () => clearInterval(interval);
  }, []);

  const handleImageError = (userId) => {
    setImageErrors(prev => ({ ...prev, [userId]: true }));
  };

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setConversations(response.data.conversations || []);
    } catch (err) {
      const msg = err.response?.data?.error || '';
      const profileCompletion = err.response?.data?.profileCompletion;
      const required = err.response?.data?.required;
      
      if (err.response?.status === 403 && msg.toLowerCase().includes('complete')) {
        if (profileCompletion !== undefined && required !== undefined) {
          alert(`⚠️ Profile Incomplete\n\nYour profile is ${profileCompletion}% complete.\nYou need at least ${required}% to access messages.\n\nPlease complete your profile first.`);
        }
        navigate('/profile');
        return;
      }
      console.error('Error fetching conversations:', err);
      setError(err.response?.data?.error || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.user?.nickname?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversations...</p>
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
            <div className="flex items-center gap-2 md:gap-4 mb-3 md:mb-4">
              <button
                onClick={() => navigate('/discover')}
                className="text-blue-500 hover:text-blue-600 transition p-2 rounded-lg hover:bg-blue-100 flex-shrink-0"
                title="Back"
              >
                <FaArrowLeft size={24} />
              </button>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2 min-w-0">
                <FaComments className="text-blue-500 flex-shrink-0" /> 
                <span className="truncate">Messages</span>
              </h1>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
              />
            </div>
          </div>
        </div>

        {/* Conversations List */}
        <div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg m-3 md:m-4 text-sm">
              {error}
            </div>
          )}

          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <FaComments size={48} className="text-blue-300 mb-4" />
              <p className="text-gray-600 text-lg mb-2">No conversations yet</p>
              <p className="text-gray-500 text-center mb-6">
                {searchTerm
                  ? 'No conversations match your search'
                  : 'Like profiles and start conversations!'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => navigate('/discover')}
                  className="btn-primary"
                >
                  Start Discovering
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation._id}
                  onClick={() => navigate(`/chat/${conversation._id}`)}
                  className="w-full bg-white hover:bg-gray-50 p-4 text-left transition border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0 w-16 h-16">
                      {conversation.user?.photos && conversation.user.photos.length > 0 && !imageErrors[conversation.user._id] ? (
                        <img
                          src={getImageUrl(conversation.user.photos[0].url)}
                          alt={conversation.user.name}
                          className="w-16 h-16 rounded-full object-cover bg-gray-200"
                          onError={() => handleImageError(conversation.user._id)}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
                          {(conversation.user?.name || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      {conversation.user?.isOnline && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {conversation.user?.nickname || conversation.user?.name}
                      </h3>
                      <p className={`text-xs font-medium mb-1 ${conversation.user?.isOnline ? 'text-green-600' : 'text-gray-500'}`}>
                        {conversation.user?.isOnline ? '🟢 Online' : '⚪ Offline'}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {conversation.lastMessage?.message || 'No messages yet'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {conversation.lastMessage?.createdAt &&
                          formatDate(conversation.lastMessage.createdAt)}
                      </p>
                    </div>

                    {/* Unread Badge */}
                    {conversation.unreadCount > 0 && (
                      <div className="flex-shrink-0 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                        {conversation.unreadCount}
                      </div>
                    )}
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
  const msgDate = new Date(date);
  const diffMs = now - msgDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return msgDate.toLocaleDateString();
}

export default MessagesPage;
