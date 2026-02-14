import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSignOutAlt, FaTrash, FaCamera, FaClock, FaShieldAlt } from 'react-icons/fa';
import BottomNavBar from '../components/BottomNavBar';
import LogoutConfirmDialog from '../components/LogoutConfirmDialog';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function ProfilePage({ user, setUser, handleLogout: handleLogoutProp }) {
  const [formData, setFormData] = useState({
    nickname: user?.nickname || '',
    gender: user?.gender || '',
    dob: user?.dob ? user.dob.split('T')[0] : '',
    university: user?.university || '',
    course: user?.course || '',
    year: user?.year || '',
    interests: user?.interests?.join(', ') || '',
    bio: user?.bio || '',
    location: user?.location || '',
    height: user?.height || '',
    bodyType: user?.bodyType || '',
    relationshipGoal: user?.relationshipGoal || 'Dating'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photos, setPhotos] = useState(user?.photos || []);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [activeTab, setActiveTab] = useState('view'); // view, edit, photos, security
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();

  // Calculate profile completion percentage
  useEffect(() => {
    calculateProfileCompletion();
  }, [user, photos, formData]);

  const calculateProfileCompletion = () => {
    const fields = [
      formData.nickname,
      formData.gender,
      formData.dob,
      formData.university,
      formData.course,
      formData.year,
      formData.interests,
      formData.bio,
      formData.location,
      photos.length > 0,
      formData.relationshipGoal
    ];
    const completed = fields.filter(f => f).length;
    setProfileCompletion(Math.round((completed / fields.length) * 100));
  };

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
        interests: formData.interests.split(',').map(i => i.trim()).filter(i => i),
        bio: formData.bio,
        location: formData.location,
        height: formData.height,
        bodyType: formData.bodyType,
        relationshipGoal: formData.relationshipGoal
      };

      const response = await axios.put(`${API_URL}/users/profile`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUser(response.data.user);
      setMessage('Profile updated successfully!');

      // Log client-side for analytics/debugging (server logs are authoritative)
      try {
        console.info('Profile updated', { userId: response.data.user._id, profileCompletion: response.data.user.profileCompletion });
      } catch (e) { /* ignore */ }
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      const token = localStorage.getItem('token');
      const formDataObj = new FormData();
      formDataObj.append('photo', file);

      const response = await axios.post(`${API_URL}/users/upload-photo`, formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      setPhotos(response.data.photos);
      setMessage('Photo uploaded successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (publicId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/users/photos/${publicId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPhotos(photos.filter(p => p.publicId !== publicId));
      setMessage('Photo deleted successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to delete photo');
    }
  };

  // Centralized logout: prefer App-provided handler, otherwise fallback to local logout
  const performLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    if (typeof handleLogoutProp === 'function') {
      try {
        handleLogoutProp();
      } catch (err) {
        console.error('Error in App logout handler:', err);
      }
      navigate('/login');
      return;
    }

    // Fallback local logout
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // For compatibility, expose the App-level handler globally if provided
  useEffect(() => {
    if (typeof handleLogoutProp === 'function') {
      window.__APP_HANDLE_LOGOUT__ = handleLogoutProp;
    }

    return () => {
      if (window.__APP_HANDLE_LOGOUT__ === handleLogoutProp) {
        delete window.__APP_HANDLE_LOGOUT__;
      }
    };
  }, [handleLogoutProp]);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-orange-50 p-4 pb-24">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 mt-4">
            <button
              onClick={() => navigate('/discover')}
              className="text-pink-500 hover:text-pink-600 transition p-2 rounded-lg hover:bg-pink-100"
              title="Back"
            >
              <FaArrowLeft size={24} />
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">My Profile</h1>
            <button
              onClick={performLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-3 md:px-4 py-2 rounded-lg transition font-medium flex items-center gap-2 text-sm md:text-base"
              title="Logout"
            >
              <FaSignOutAlt size={18} />
              <span className="hidden sm:inline">Logout</span>
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

          {/* Profile Completion Bar */}
          <div className="mb-6 bg-gradient-to-r from-pink-100 to-orange-100 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-gray-700">Profile Completion</span>
              <span className="text-pink-600 font-bold">{profileCompletion}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-pink-500 to-orange-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${profileCompletion}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {profileCompletion === 100 
                ? '✓ Your profile is complete!' 
                : 'Complete your profile to attract more matches'}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 mb-6 border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('view')}
              className={`px-4 py-3 font-semibold transition whitespace-nowrap ${
                activeTab === 'view'
                  ? 'text-pink-600 border-b-2 border-pink-600'
                  : 'text-gray-600'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-4 py-3 font-semibold transition whitespace-nowrap ${
                activeTab === 'edit'
                  ? 'text-pink-600 border-b-2 border-pink-600'
                  : 'text-gray-600'
              }`}
            >
              Edit Info
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`px-4 py-3 font-semibold transition whitespace-nowrap ${
                activeTab === 'photos'
                  ? 'text-pink-600 border-b-2 border-pink-600'
                  : 'text-gray-600'
              }`}
            >
              Photos ({photos.length})
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-4 py-3 font-semibold transition whitespace-nowrap ${
                activeTab === 'security'
                  ? 'text-pink-600 border-b-2 border-pink-600'
                  : 'text-gray-600'
              }`}
            >
              Security
            </button>
          </div>

          {/* View Tab - Profile Overview */}
          {activeTab === 'view' && (
            <div className="space-y-6">
              {/* Profile Overview Card */}
              <div className="bg-gradient-to-r from-pink-100 to-orange-100 p-6 rounded-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">{user?.name}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Nickname</p>
                    <p className="text-lg font-semibold text-gray-800">{user?.nickname || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Gender</p>
                    <p className="text-lg font-semibold text-gray-800">{user?.gender || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Age</p>
                    <p className="text-lg font-semibold text-gray-800">{user?.age || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">University</p>
                    <p className="text-lg font-semibold text-gray-800">{user?.university || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Course</p>
                    <p className="text-lg font-semibold text-gray-800">{user?.course || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Year</p>
                    <p className="text-lg font-semibold text-gray-800">{user?.year || 'Not set'}</p>
                  </div>
                </div>
              </div>

              {/* Bio Card */}
              {user?.bio && (
                <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
                  <h3 className="font-bold text-lg text-gray-800 mb-2">About Me</h3>
                  <p className="text-gray-700">{user.bio}</p>
                </div>
              )}

              {/* Interests Card */}
              {user?.interests && user.interests.length > 0 && (
                <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
                  <h3 className="font-bold text-lg text-gray-800 mb-3">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {user.interests.map((interest, idx) => (
                      <span key={idx} className="bg-pink-200 text-pink-800 px-4 py-2 rounded-full text-sm font-medium">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats Card */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Relationship Goal</p>
                  <p className="text-lg font-bold text-blue-900">{user?.relationshipGoal || 'Dating'}</p>
                </div>
                <div className="bg-gradient-to-br from-green-100 to-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Member Since</p>
                  <p className="text-lg font-bold text-green-900">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Today'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('edit')}
                className="w-full btn-primary py-3 text-lg font-semibold"
              >
                Edit Profile
              </button>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'edit' && (
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relationship Goal</label>
                  <select name="relationshipGoal" value={formData.relationshipGoal} onChange={handleChange} className="input-field">
                    <option value="Dating">Dating</option>
                    <option value="Hookup">Hookup</option>
                    <option value="Friendship">Friendship</option>
                    <option value="Other">Other</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Choose what you're primarily looking for — dating, hookups, or friendship. Be respectful and honest.</p>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Your city"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="e.g., 175"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Body Type</label>
                  <select
                    name="bodyType"
                    value={formData.bodyType}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="">Select Body Type</option>
                    <option value="Slim">Slim</option>
                    <option value="Athletic">Athletic</option>
                    <option value="Average">Average</option>
                    <option value="Curvy">Curvy</option>
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
          )}

          {/* Photos Tab */}
          {activeTab === 'photos' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Your Photos</h3>
              <p className="text-gray-600 text-sm mb-4">Upload up to 10 photos. The first photo will be your profile picture.</p>
              
              {/* Upload Section */}
              <div className="mb-6 p-4 border-2 border-dashed border-pink-300 rounded-lg hover:border-pink-500 transition">
                <label className="cursor-pointer flex flex-col items-center justify-center">
                  <FaCamera className="text-pink-500 text-3xl mb-2" />
                  <span className="text-gray-700 font-semibold">Click to upload photo</span>
                  <span className="text-gray-500 text-sm">PNG, JPG, GIF up to 10MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto || photos.length >= 10}
                    className="hidden"
                  />
                </label>
              </div>

              {uploadingPhoto && <p className="text-blue-600 font-semibold">Uploading...</p>}

              {/* Photos Grid */}
              {photos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {photos.map((photo, idx) => (
                    <div key={photo.publicId} className="relative group">
                      <img
                        src={photo.url}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      {idx === 0 && (
                        <span className="absolute top-2 left-2 bg-pink-500 text-white text-xs px-2 py-1 rounded">
                          Main
                        </span>
                      )}
                      <button
                        onClick={() => handleDeletePhoto(photo.publicId)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No photos yet. Upload your first photo!</p>
                </div>
              )}
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <FaShieldAlt className="text-blue-600 text-xl mt-1" />
                <div>
                  <h4 className="font-semibold text-blue-900">Verification Status</h4>
                  <p className="text-blue-800 text-sm mt-1">
                    {user?.verified ? '✓ Your account is verified!' : '⏳ Your account is pending verification'}
                  </p>
                  <p className="text-blue-700 text-xs mt-2">
                    We verify accounts using university email confirmation to ensure safety.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <FaClock className="text-green-600 text-xl mt-1" />
                <div>
                  <h4 className="font-semibold text-green-900">Activity Status</h4>
                  <p className="text-green-800 text-sm mt-1">
                    Last active: {user?.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Just now'}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-yellow-900">Privacy Settings</h4>
                <ul className="text-yellow-800 text-sm mt-3 space-y-2">
                  <li>✓ Your location is hidden from profiles</li>
                  <li>✓ Messages are encrypted</li>
                  <li>✓ You can block anyone anytime</li>
                  <li>✓ Your data is never shared with third parties</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      <LogoutConfirmDialog 
        isOpen={showLogoutConfirm}
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
      />

      <BottomNavBar user={user} />
    </>
  );
}

export default ProfilePage;
