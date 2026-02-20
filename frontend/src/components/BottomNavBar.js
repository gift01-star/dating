import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaFire, FaHeart, FaComments, FaUser } from 'react-icons/fa';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function BottomNavBar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [counts, setCounts] = useState({ matches: 0, likes: 0, messages: 0 });

  // Note: visibility check is done after hooks to comply with React Hooks rules

  const token = localStorage.getItem('token');

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  useEffect(() => {
    let mounted = true;
    let intervalId;

    const fetchCounts = async () => {
      if (!token) return;
      try {
        const res = await axios.get(`${API_URL}/matches/counts`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (mounted && res.data) {
          setCounts({
            matches: res.data.matches || 0,
            likes: res.data.likes || 0,
            messages: res.data.messages || 0
          });
        }
      } catch (err) {
        // ignore errors silently
      }
    };

    fetchCounts();
    // refresh every 30s
    intervalId = setInterval(fetchCounts, 30000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [token]);

  // Hide nav bar until the user has at least 5% profile completion
  if (!user || (user.profileCompletion || 0) < 5) return null;

  const navItems = [
    {
      path: '/discover',
      label: 'Discover',
      icon: <FaFire size={24} />,
      color: 'text-orange-500',
      badge: 0
    },
    {
      path: '/matches',
      label: 'Matches',
      icon: <FaHeart size={24} />,
      color: 'text-pink-500',
      badge: counts.matches
    },
    {
      path: '/likes',
      label: 'Likes',
      icon: <FaHeart size={24} />,
      color: 'text-red-500',
      badge: counts.likes
    },
    {
      path: '/messages',
      label: 'Messages',
      icon: <FaComments size={24} />,
      color: 'text-blue-500',
      badge: counts.messages
    },
    {
      path: '/profile',
      label: 'Profile',
      icon: <FaUser size={24} />,
      color: 'text-purple-500',
      badge: 0
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-around">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={async () => {
                try {
                  const token = localStorage.getItem('token');
                  if (item.path === '/messages' && token) {
                    await axios.post(`${API_URL}/messages/mark-all-read`, {}, { headers: { Authorization: `Bearer ${token}` } });
                    setCounts(prev => ({ ...prev, messages: 0 }));
                  }
                  if (item.path === '/likes' && token) {
                    await axios.post(`${API_URL}/matches/mark-likes-seen`, {}, { headers: { Authorization: `Bearer ${token}` } });
                    setCounts(prev => ({ ...prev, likes: 0 }));
                  }
                } catch (err) {
                  // ignore errors
                }
                navigate(item.path);
              }}
              className={`relative flex flex-col items-center justify-center py-3 px-4 w-full transition-colors ${
                isActive(item.path)
                  ? `${item.color} font-semibold`
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className={isActive(item.path) ? item.color : 'text-gray-500'}>
                {item.icon}
              </div>
              {item.badge > 0 && (
                <span className="absolute -top-0.5 right-6 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BottomNavBar;
