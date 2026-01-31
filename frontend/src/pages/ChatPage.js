import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPaperPlane, FaBan, FaFlag } from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL;

function ChatPage({ user }) {
  const { matchId } = useParams();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [matchInfo, setMatchInfo] = useState(null);
  const navigate = useNavigate();

  // Keep a local copy of the user so we can update blocked/unblocked state locally
  const [localUser, setLocalUser] = useState(user);
  useEffect(() => setLocalUser(user), [user]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, [matchId]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/messages/${matchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

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
      
      setLoading(false);
    } catch (err) {
      const msg = err.response?.data?.error || '';
      if (err.response?.status === 403 && msg.toLowerCase().includes('complete your profile')) {
        navigate('/profile');
        return;
      }
      console.error('Error fetching messages:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!message.trim()) return;

    try {
      const token = localStorage.getItem('token');

      await axios.post(`${API_URL}/messages/${matchId}`, { message }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage('');
      fetchMessages();
    } catch (err) {
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

      console.error('Error sending message:', err);
      alert('Error sending message. Please try again.');
    }
  };

  // Block a user
  const handleBlockUser = async (blockUserId) => {
    const confirmBlock = window.confirm('Block this user? They will not be able to message you.');
    if (!confirmBlock) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/users/block/${blockUserId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('User blocked. You will no longer receive messages from them.');
      navigate('/matches');
    } catch (err) {
      console.error('Error blocking user:', err);
      alert('Could not block user. Please try again.');
    }
  };

  // Unblock a user
  const handleUnblockUser = async (unblockUserId) => {
    const confirmUnblock = window.confirm('Unblock this user? They will be able to message you again.');
    if (!confirmUnblock) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/users/unblock/${unblockUserId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local user state to reflect unblock immediately
      const updatedBlocked = (localUser.blocked || []).filter(id => String(id) !== String(unblockUserId));
      setLocalUser({ ...localUser, blocked: updatedBlocked });

      alert('User unblocked. You can now send messages.');
      fetchMessages();
    } catch (err) {
      console.error('Error unblocking user:', err);
      alert('Could not unblock user. Please try again.');
    }
  };

  // Report a user
  const handleReportUser = async (reportUserId) => {
    const reason = window.prompt('Report reason (required): e.g. Insulting messages, harassment');
    if (!reason || !reason.trim()) return;

    const description = window.prompt('Additional details (optional):');

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/reports`, {
        reportedUser: reportUserId,
        reason,
        description
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Report submitted. Thank you for helping keep the community safe.');
    } catch (err) {
      console.error('Error submitting report:', err);
      alert('Could not submit report. Please try again.');
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
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/matches')}
              className="text-pink-500 hover:text-pink-600"
            >
              <FaArrowLeft size={24} />
            </button>
            {matchInfo?.user && (
              <div className="flex items-center gap-3">
                {matchInfo.user.photos && matchInfo.user.photos.length > 0 ? (
                  <div className="relative">
                    <img
                      src={matchInfo.user.photos[0].url}
                      alt={matchInfo.user.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    {matchInfo.user.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-pink-300 flex items-center justify-center text-white font-bold relative">
                    {(matchInfo.user.name || 'U').charAt(0).toUpperCase()}
                    {matchInfo.user.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div>
                    <h1 className="text-lg font-bold text-gray-800">
                      {matchInfo.user.nickname || matchInfo.user.name}
                    </h1>
                    <p className="text-xs text-gray-500">
                      {matchInfo.user.university || ''}
                    </p>
                  </div>

                  {/* Block / Unblock & Report actions */}
                  <div className="ml-4 flex items-center gap-2">
                    {youBlockedOther ? (
                      <button
                        onClick={() => handleUnblockUser(String(matchInfo.user._id))}
                        title="Unblock user"
                        className="text-green-600 hover:text-green-700 p-2 rounded"
                      >
                        Unblock
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBlockUser(String(matchInfo.user._id))}
                        title="Block user"
                        className="text-red-500 hover:text-red-600 p-2 rounded"
                      >
                        <FaBan />
                      </button>
                    )}

                    <button
                      onClick={() => handleReportUser(String(matchInfo.user._id))}
                      title="Report user"
                      className="text-yellow-600 hover:text-yellow-700 p-2 rounded"
                    >
                      <FaFlag />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>Start the conversation! 💬</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg._id}
                className={`flex ${msg.senderId === localUser?._id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.senderId === user._id
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <p className="break-words">{msg.message}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isMessagingDisabled && (
        <div className="max-w-2xl mx-auto text-center text-sm text-red-500 py-2">
          {otherBlockedYou ? 'This user has blocked you — you cannot send messages.' : 'You have blocked this user. Unblock them to send messages.'}
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isMessagingDisabled ? 'Messaging not available' : 'Type a message...'}
              className="input-field flex-1"
              disabled={isMessagingDisabled}
            />
            <button
              type="submit"
              className={`btn-primary flex items-center gap-2 ${isMessagingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isMessagingDisabled}
            >
              <FaPaperPlane /> Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
