import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPaperPlane, FaBan, FaFlag, FaSmile, FaCheck, FaCheckDouble } from 'react-icons/fa';
import getImageUrl from '../utils/imageUrl';

const API_URL = process.env.REACT_APP_API_URL || 'https://edulove-backend.onrender.com/api';

// Format date/time helpers with error handling
const formatMessageTime = (date) => {
  try {
    if (!date) return 'Just now';
    
    const msgDate = new Date(date);
    // Check if date is invalid
    if (isNaN(msgDate.getTime())) {
      return 'Just now';
    }
    
    const now = new Date();
    const isToday = now.toDateString() === msgDate.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === msgDate.toDateString();
    
    if (isToday) {
      return msgDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (isYesterday) {
      return 'Yesterday ' + msgDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else {
      return msgDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + 
             msgDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
  } catch (err) {
    console.error('Error formatting message time:', err);
    return 'Just now';
  }
};

const formatDateSeparator = (date) => {
  try {
    if (!date) return 'Today';
    
    const msgDate = new Date(date);
    // Check if date is invalid
    if (isNaN(msgDate.getTime())) {
      return 'Today';
    }
    
    const now = new Date();
    const isToday = now.toDateString() === msgDate.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === msgDate.toDateString();
    
    if (isToday) {
      return 'Today';
    } else if (isYesterday) {
      return 'Yesterday';
    } else {
      return msgDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: msgDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    }
  } catch (err) {
    console.error('Error formatting date separator:', err);
    return 'Today';
  }
};

// Group messages by date with error handling
const groupMessagesByDate = (messages) => {
  const grouped = {};
  
  if (!Array.isArray(messages)) {
    return grouped;
  }
  
  messages.forEach(msg => {
    try {
      if (!msg || !msg.createdAt) return;
      
      const date = new Date(msg.createdAt);
      if (isNaN(date.getTime())) {
        // If date is invalid, use current date as fallback
        const todayKey = new Date().toDateString();
        if (!grouped[todayKey]) grouped[todayKey] = [];
        grouped[todayKey].push(msg);
        return;
      }
      
      const dateKey = date.toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: date,
          messages: []
        };
      }
      grouped[dateKey].messages.push(msg);
    } catch (err) {
      console.error('Error grouping message:', err);
    }
  });
  
  return grouped;
};

function ChatPage({ user }) {
  const { matchId } = useParams();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [matchInfo, setMatchInfo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();
  const messagesEndRef = React.useRef(null);

  // Keep a local copy of the user so we can update blocked/unblocked state locally
  const [localUser, setLocalUser] = useState(user);
  useEffect(() => setLocalUser(user), [user]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, [matchId]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('[ChatPage] Fetching messages for matchId:', matchId);
      
      const response = await axios.get(`${API_URL}/messages/${matchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('[ChatPage] Got messages:', response.data.length, 'messages');
      setMessages(response.data);
      
      // Fetch match info to display user details
      try {
        const matchResponse = await axios.get(`${API_URL}/matches/${matchId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const matchData = matchResponse.data;
        // Normalize to `matchInfo.user` to keep the UI simple — choose the other user in the match
        let otherUser = null;
        if (matchData.user) {
          otherUser = matchData.user;
        } else {
          const u1 = matchData.user1;
          const u2 = matchData.user2;
          // pick the one that's not the current user
          if (String(u1._id) === String(user._id)) otherUser = u2;
          else otherUser = u1;
        }

        setMatchInfo({ ...matchData, user: otherUser });
      } catch (err) {
        console.error('Error fetching match info:', err);
      }
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
      console.error('[ChatPage] Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!message.trim()) return;

    try {
      const token = localStorage.getItem('token');

      console.log('[ChatPage] Sending message for matchId:', matchId);
      
      const response = await axios.post(`${API_URL}/messages/${matchId}`, { message }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('[ChatPage] Message sent successfully:', response.data);
      
      setMessage('');
      await fetchMessages();
    } catch (err) {
      // Profile completion errors
      const profileCompletion = err.response?.data?.profileCompletion;
      const required = err.response?.data?.required;
      
      if (err.response && err.response.status === 403 && profileCompletion !== undefined) {
        alert(`⚠️ Profile Incomplete\n\nYour profile is ${profileCompletion}% complete.\nYou need at least ${required}% to send messages.\n\nPlease complete your profile first.`);
        navigate('/profile');
        return;
      }

      // Payments temporarily disabled — show friendly message instead of redirecting
      if (err.response && err.response.status === 402) {
        alert('Payments are currently disabled. Messaging is free.');
        fetchMessages();
        return;
      }

      // Blocked errors
      if (err.response && err.response.status === 403 && err.response.data?.error?.toLowerCase().includes('blocked')) {
        alert(err.response.data.error || 'Messaging blocked');
        return;
      }

      console.error('[ChatPage] Error sending message:', err);
      alert('Error sending message. Please try again.');
    }
  };

  // Block a user
  const handleBlockUser = async (blockUserId) => {
    const confirmBlock = window.confirm('🔒 Block this user?\n\nThey will not be able to send you messages. You can unblock them later from your matches.');
    if (!confirmBlock) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/users/block/${blockUserId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local user state
      if (response.data.blocked) {
        setLocalUser({ ...localUser, blocked: response.data.blocked });
      }

      alert('✅ User blocked successfully.\n\nYou will not receive messages from them.');
      navigate('/matches');
    } catch (err) {
      console.error('Error blocking user:', err);
      alert('❌ Could not block user. ' + (err.response?.data?.error || 'Please try again.'));
    }
  };

  // Unblock a user
  const handleUnblockUser = async (unblockUserId) => {
    const confirmUnblock = window.confirm('🔓 Unblock this user?\n\nThey will be able to send you messages again.');
    if (!confirmUnblock) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/users/unblock/${unblockUserId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local user state with new blocked list
      if (response.data.blocked) {
        setLocalUser({ ...localUser, blocked: response.data.blocked });
      } else {
        // Fallback: filter manually
        const updatedBlocked = (localUser.blocked || []).filter(id => String(id) !== String(unblockUserId));
        setLocalUser({ ...localUser, blocked: updatedBlocked });
      }

      alert('✅ User unblocked successfully.\n\nYou can now exchange messages with them.');
      fetchMessages();
    } catch (err) {
      console.error('Error unblocking user:', err);
      alert('❌ Could not unblock user. ' + (err.response?.data?.error || 'Please try again.'));
    }
  };

  // Report a user
  const handleReportUser = async (reportUserId) => {
    const reason = window.prompt('📋 Report reason (required):\n\nExamples: Insulting messages, Harassment, Inappropriate content, Spam');
    if (!reason || !reason.trim()) {
      alert('⚠️ Report cancelled. A reason is required.');
      return;
    }

    const description = window.prompt('📝 Additional details (optional):\n\nProvide more information to help us review the report.');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/reports`, {
        reportedUser: reportUserId,
        reason: reason.trim(),
        description: description?.trim() || ''
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('✅ Report submitted successfully!\n\nThank you for helping keep the community safe. Our team will review this report.');
      console.info('Report submitted:', response.data);
    } catch (err) {
      console.error('Error submitting report:', err);
      if (err.response?.status === 400 && err.response?.data?.error?.includes('yourself')) {
        alert('❌ You cannot report yourself.');
      } else {
        alert('❌ Could not submit report. ' + (err.response?.data?.error || 'Please try again.'));
      }
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  const otherBlockedYou = !!(matchInfo && matchInfo.user && (matchInfo.user.blocked || []).some(id => String(id) === String(localUser?._id)));
  const youBlockedOther = !!(localUser && (localUser.blocked || []).some(id => String(id) === String(matchInfo?.user?._id)));
  const isMessagingDisabled = otherBlockedYou || youBlockedOther;

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-pink-50 to-orange-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-3 md:p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2 md:gap-4 overflow-hidden">
          <button
            onClick={() => navigate('/matches')}
            className="text-pink-500 hover:text-pink-600 transition p-2 rounded-lg hover:bg-pink-100 flex-shrink-0"
            title="Back"
          >
            <FaArrowLeft size={20} />
          </button>
          {matchInfo?.user && (
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              {matchInfo.user.photos && matchInfo.user.photos.length > 0 && !imageError ? (
                <div className="relative flex-shrink-0">
                  <img
                    src={getImageUrl(matchInfo.user.photos[0].url)}
                    alt={matchInfo.user.name}
                    className="w-8 md:w-10 h-8 md:h-10 rounded-full object-cover bg-pink-200"
                    onError={() => setImageError(true)}
                  />
                  {matchInfo.user.isOnline && (
                    <div className="absolute bottom-0 right-0 w-2 md:w-3 h-2 md:h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
              ) : (
                <div className="w-8 md:w-10 h-8 md:h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white font-bold text-sm md:text-base relative flex-shrink-0">
                  {(matchInfo.user.name || 'U').charAt(0).toUpperCase()}
                  {matchInfo.user.isOnline && (
                    <div className="absolute bottom-0 right-0 w-2 md:w-3 h-2 md:h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-base md:text-lg font-bold text-gray-800 truncate">
                  {matchInfo.user.nickname || matchInfo.user.name}
                </h1>
                <div className="text-xs text-gray-500 truncate">
                  {matchInfo.user.university && (
                    <span>{matchInfo.user.university}</span>
                  )}
                  <p className={`text-xs ${matchInfo.user.isOnline ? 'text-green-600' : 'text-gray-500'}`}>
                    {matchInfo.user.isOnline ? '🟢 Online' : '⚪ Offline'}
                  </p>
                </div>
              </div>

              {/* Block / Unblock & Report actions */}
              <div className="ml-2 md:ml-4 flex items-center gap-1 md:gap-2 flex-shrink-0">
                {youBlockedOther ? (
                  <button
                    onClick={() => handleUnblockUser(String(matchInfo.user._id))}
                    title="Unblock user"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 p-2 rounded text-sm font-medium transition"
                  >
                    <span className="hidden md:inline">Unblock</span>
                    <span className="md:hidden">✓</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleBlockUser(String(matchInfo.user._id))}
                    title="Block user"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 p-2 rounded transition"
                  >
                    <FaBan size={18} />
                  </button>
                )}

                <button
                  onClick={() => handleReportUser(String(matchInfo.user._id))}
                  title="Report user"
                  className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 p-2 rounded transition"
                >
                  <FaFlag size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full pb-20 md:pb-4">
        <div className="space-y-6">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-12 h-full flex items-center justify-center flex-col">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-lg font-medium">Start the conversation!</p>
              <p className="text-sm mt-1">Send a message to get things rolling</p>
            </div>
          ) : (
            Object.entries(groupMessagesByDate(messages)).map(([dateKey, dateGroup]) => (
              <div key={dateKey}>
                {/* Date Separator */}
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <span className="text-xs text-gray-500 font-medium px-3 py-1 bg-gray-50 rounded-full">
                    {formatDateSeparator(dateGroup.date || dateKey)}
                  </span>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>
                
                {/* Messages for this day */}
                <div className="space-y-2">
                  {dateGroup.messages.map((msg) => (
                    <div
                      key={msg._id}
                      className={`flex ${msg.senderId === localUser?._id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`group flex items-end gap-2 max-w-sm ${msg.senderId === localUser?._id ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        {/* Message bubble */}
                        <div
                          className={`px-4 py-2 rounded-2xl shadow-sm transition ${
                            msg.senderId === localUser?._id
                              ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-tr-none'
                              : 'bg-gray-100 text-gray-900 rounded-tl-none'
                          }`}
                        >
                          <p className="break-words text-sm md:text-base leading-relaxed">{msg.message}</p>
                          <div className={`flex items-center gap-1 mt-1 text-xs ${msg.senderId === localUser?._id ? 'text-pink-100' : 'text-gray-500'}`}>
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            {msg.senderId === localUser?._id && (
                              msg.read ? (
                                <FaCheckDouble size={12} className="text-blue-300" title="Read" />
                              ) : (
                                <FaCheck size={12} />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {isMessagingDisabled && (
        <div className="bg-red-50 border-t-2 border-red-200 text-center text-xs md:text-sm text-red-600 py-3 px-4 font-medium">
          {otherBlockedYou ? '🚫 This user has blocked you — you cannot send messages.' : '🚫 You have blocked this user. Unblock them to send messages.'}
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-3 md:p-4 fixed bottom-0 left-0 right-0 shadow-lg md:static z-40">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-2 relative">
            {/* Emoji Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="bg-pink-500 hover:bg-pink-600 text-white px-2 md:px-3 py-2 rounded transition flex items-center gap-1 text-sm md:text-base"
                title="Add emoji"
              >
                <FaSmile size={16} />
              </button>
              
              {showEmojiPicker && (
                <div className="absolute bottom-12 left-0 bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-50 w-64 md:w-80">
                  <div className="grid grid-cols-8 gap-1">
                    {['😀', '😂', '😍', '🎉', '👍', '❤️', '🔥', '✨', '💯', '🙌', '😎', '😡', '😢', '🤔', '😴', '🚀', '💻', '📱', '🎮', '🎵', '⚽', '🍕', '🌟', '☀️', '🌙', '🎂', '🍰', '🎊'].map((emoji, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setMessage(message + emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="text-xl md:text-2xl p-1 hover:bg-gray-100 rounded cursor-pointer transition"
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isMessagingDisabled ? 'Messaging unavailable' : 'Type a message... 😊'}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm md:text-base"
              disabled={isMessagingDisabled}
            />
            <button
              type="submit"
              className={`bg-pink-500 hover:bg-pink-600 text-white px-2 md:px-4 py-2 rounded transition flex items-center gap-1 text-sm md:text-base font-medium ${isMessagingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isMessagingDisabled}
              title="Send"
            >
              <FaPaperPlane size={16} />
              <span className="hidden md:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
