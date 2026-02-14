import React from 'react';
import { FaSignOutAlt, FaTimes } from 'react-icons/fa';

function LogoutConfirmDialog({ isOpen, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 animate-in">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
        >
          <FaTimes />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-red-100 rounded-full p-4">
            <FaSignOutAlt className="text-4xl text-red-500" />
          </div>
        </div>

        {/* Content */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">Logout?</h2>
        <p className="text-gray-600 text-center mb-8">
          Are you sure you want to logout? You'll need to log back in to access your account.
        </p>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition text-center"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition text-center flex items-center justify-center gap-2"
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogoutConfirmDialog;
