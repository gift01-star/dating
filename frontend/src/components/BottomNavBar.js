import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaFire, FaHeart, FaComments, FaUser } from 'react-icons/fa';

function BottomNavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navItems = [
    {
      path: '/discover',
      label: 'Discover',
      icon: <FaFire size={24} />,
      color: 'text-orange-500'
    },
    {
      path: '/matches',
      label: 'Matches',
      icon: <FaHeart size={24} />,
      color: 'text-pink-500'
    },
    {
      path: '/likes',
      label: 'Likes',
      icon: <FaHeart size={24} />,
      color: 'text-red-500'
    },
    {
      path: '/messages',
      label: 'Messages',
      icon: <FaComments size={24} />,
      color: 'text-blue-500'
    },
    {
      path: '/profile',
      label: 'Profile',
      icon: <FaUser size={24} />,
      color: 'text-purple-500'
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-around">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-3 px-4 w-full transition-colors ${
                isActive(item.path)
                  ? `${item.color} font-semibold`
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className={isActive(item.path) ? item.color : 'text-gray-500'}>
                {item.icon}
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
