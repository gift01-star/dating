import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPaperPlane } from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL;

function ChatPage({ user }) {
  const { matchId } = useParams();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [matchInfo, setMatchInfo] = useState(null);
  const navigate = useNavigate();

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
      setLoading(false);
    } catch (err) {
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
      console.error('Error sending message:', err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-pink-50 to-orange-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/matches')}
            className="text-pink-500 hover:text-pink-600"
          >
            <FaArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Chat</h1>
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
                className={`flex ${msg.senderId === user._id ? 'justify-end' : 'justify-start'}`}
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

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="input-field flex-1"
            />
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
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
