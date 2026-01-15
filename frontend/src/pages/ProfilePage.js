import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSignOutAlt } from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL;

function ProfilePage({ user, setUser }) {
  const [formData, setFormData] = useState({
    nickname: user?.nickname || '',
    gender: user?.gender || '',
    dob: user?.dob ? user.dob.split('T')[0] : '',
    university: user?.university || '',
    course: user?.course || '',
    year: user?.year || '',
    interests: user?.interests?.join(', ') || '',
    bio: user?.bio || ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');

      const updateData = {
        nickname: formData.nickname,
        gender: formData.gender,
        dob: formData.dob,
        university: formData.university,
        course: formData.course,
        year: formData.year,
        interests: formData.interests.split(',').map(i => i.trim()),
        bio: formData.bio
      };

      const response = await axios.put(`${API_URL}/users/profile`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUser(response.data.user);
      setMessage('Profile updated successfully!');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-orange-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 mt-4">
          <button
            onClick={() => navigate('/discover')}
            className="text-pink-500 hover:text-pink-600"
          >
            <FaArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
          <button
            onClick={handleLogout}
            className="text-pink-500 hover:text-pink-600"
            title="Logout"
          >
            <FaSignOutAlt size={24} />
          </button>
        </div>

        {/* Form */}
        <div className="card">
          {message && (
            <div className={`p-4 rounded mb-4 ${
              message.includes('successfully')
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nickname</label>
                <input
                  type="text"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Your nickname on EduLove"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">University</label>
                <input
                  type="text"
                  name="university"
                  value={formData.university}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Your university"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course/Faculty</label>
                <input
                  type="text"
                  name="course"
                  value={formData.course}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Your course"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year of Study</label>
                <select
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">Select Year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Interests (comma-separated)</label>
              <input
                type="text"
                name="interests"
                value={formData.interests}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., Reading, Sports, Music, Travel"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                className="input-field h-32"
                placeholder="Tell others about yourself..."
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary font-medium disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>

          <hr className="my-6" />

          <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
            <h3 className="font-bold text-blue-900 mb-2">📸 Photo Upload</h3>
            <p className="text-blue-800 text-sm">
              Photo upload feature coming soon! You can upload up to 5 photos to your profile.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h3 className="font-bold text-blue-900 mb-2">🪪 Student Verification</h3>
            <p className="text-blue-800 text-sm">
              Your account is currently {user?.verified ? '✓ Verified' : '⏳ Pending verification'}.
              Admin team will verify your student status using your university email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
