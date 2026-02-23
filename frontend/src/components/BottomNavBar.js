import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaFire, FaHeart, FaComments, FaUser } from 'react-icons/fa';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function BottomNavBar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [counts, setCounts] = useState({ matches: 0, likes: 0, messages: 0 });

  const token = localStorage.getItem('token');

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  useEffect(() => {
    let mounted = true;
    let intervalId;
    let backoffMs = 60000; // start with 60s

    const CACHE_KEY = 'nav_counts_cache_v1';
    const MIN_POLL = 2000; // 2 seconds for real-time feel (like WhatsApp)
    const MAX_BACKOFF = 10000; // 10 seconds max backoff

    const readCache = () => {
      try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed;
      } catch (e) {
        return null;
      }
    };

    const writeCache = (data) => {
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
      } catch (e) {}
    };

    const fetchCounts = async () => {
      if (!token) return;

      const cached = readCache();
      if (cached && (Date.now() - (cached.ts || 0) < 1000)) {
        setCounts(cached.data);
        return;
      }

      try {
        const res = await axios.get(`${API_URL}/matches/counts`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (mounted && res.data) {
          const newCounts = {
            matches: res.data.matches || 0,
            likes: res.data.likes || 0,
            messages: res.data.messages || 0
          };
          setCounts(newCounts);
          writeCache(newCounts);
          backoffMs = MIN_POLL;
          // Update App-level notifications for browser tab title
          try { window.__UPDATE_APP_NOTIFICATIONS__?.(newCounts); } catch (e) {}
        }
      } catch (err) {
        const status = err?.response?.status;
        if (status === 429) {
          const retryAfter = parseInt(err.response.headers['retry-after']) || 0;
          if (retryAfter > 0) {
            backoffMs = Math.min(retryAfter * 1000, MAX_BACKOFF);
          } else {
            backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF);
          }
        } else {
          backoffMs = Math.min(backoffMs * 1.5, MAX_BACKOFF);
        }
      }
    };

    // expose global refresh so pages can trigger immediate refresh
    try { window.__REFRESH_NAV_COUNTS__ = fetchCounts; } catch (e) {}

    fetchCounts();
    intervalId = setInterval(fetchCounts, backoffMs);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      try { delete window.__REFRESH_NAV_COUNTS__; } catch (e) {}
    };
  }, [token, location.pathname]);

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
                  // Messages are marked as read when opening specific chat (per-conversation, like WhatsApp)
                  // Not when clicking the messages icon
                  if (item.path === '/likes' && token) {
                    await axios.post(`${API_URL}/matches/mark-likes-seen`, {}, { headers: { Authorization: `Bearer ${token}` } });
                    setCounts(prev => ({ ...prev, likes: 0 }));
                    try { sessionStorage.removeItem('nav_counts_cache_v1'); } catch (e) {}
                    try { window.__REFRESH_NAV_COUNTS__?.(); } catch (e) {}
                    try { window.__UPDATE_APP_NOTIFICATIONS?.(prev => ({ ...prev, likes: 0 })); } catch (e) {}
                  }
                } catch (err) {
                  // ignore errors
                }
                navigate(item.path);
              }}
              className={`flex flex-col items-center justify-center py-3 px-4 w-full transition-colors ${
                isActive(item.path)
                  ? `${item.color} font-semibold`
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className={`relative ${isActive(item.path) ? item.color : 'text-gray-500'}`}>
                {item.icon}
                {item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full shadow-lg animate-pulse">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BottomNavBar;
