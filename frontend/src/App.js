import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DiscoverPage from './pages/DiscoverPage';
import MatchesPage from './pages/MatchesPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import TermsPage from './pages/TermsPage';
import CommunityGuidelinesPage from './pages/CommunityGuidelinesPage';
import LikesPage from './pages/LikesPage';
import MessagesPage from './pages/MessagesPage';
import PaymentsPage from './pages/PaymentsPage';
import PasswordResetRequestPage from './pages/PasswordResetRequestPage';
import PasswordResetPage from './pages/PasswordResetPage';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState({ likes: 0, messages: 0, matches: 0 });

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data.user);
          setIsAuthenticated(true);
        } catch (error) {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Update document title with notification count
  useEffect(() => {
    const totalNotifications = notifications.likes + notifications.messages + notifications.matches;
    if (totalNotifications > 0) {
      document.title = `(${totalNotifications}) EduLove - University Dating`;
    } else {
      document.title = 'EduLove - University Dating';
    }
  }, [notifications]);

  // Expose notification state globally so BottomNavBar can update it
  useEffect(() => {
    window.__UPDATE_APP_NOTIFICATIONS__ = setNotifications;
    return () => {
      if (window.__UPDATE_APP_NOTIFICATIONS__ === setNotifications) {
        delete window.__UPDATE_APP_NOTIFICATIONS__;
      }
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
  };

  // Expose the logout function globally for compatibility with components
  useEffect(() => {
    window.__APP_HANDLE_LOGOUT__ = handleLogout;
    return () => {
      if (window.__APP_HANDLE_LOGOUT__ === handleLogout) delete window.__APP_HANDLE_LOGOUT__;
    };
  }, [handleLogout]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-pink-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>;
  }

  const isProfileComplete = (u) => {
    if (!u) return false;
    // Basic completion rule: nickname + at least one photo
    return !!(u.nickname && u.photos && u.photos.length > 0);
  };

  const renderProtected = (element) => {
    if (!isProfileComplete(user)) {
      return <Navigate to="/profile" />;
    }
    return element;
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={!isAuthenticated ? <LandingPage /> : <Navigate to="/discover" />} />
        <Route path="/login" element={!isAuthenticated ? <LoginPage setIsAuthenticated={setIsAuthenticated} setUser={setUser} /> : <Navigate to="/discover" />} />
        <Route path="/register" element={!isAuthenticated ? <RegisterPage setIsAuthenticated={setIsAuthenticated} setUser={setUser} /> : <Navigate to="/discover" />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/guidelines" element={<CommunityGuidelinesPage />} />
        <Route path="/reset" element={<PasswordResetRequestPage />} />
        <Route path="/reset/:token" element={<PasswordResetPage />} />

        {isAuthenticated ? (
          <>
            <Route path="/discover" element={renderProtected(<DiscoverPage user={user} handleLogout={handleLogout} />)} />
            <Route path="/matches" element={renderProtected(<MatchesPage user={user} handleLogout={handleLogout} />)} />
            <Route path="/likes" element={renderProtected(<LikesPage user={user} handleLogout={handleLogout} />)} />
            <Route path="/messages" element={renderProtected(<MessagesPage user={user} handleLogout={handleLogout} />)} />
            <Route path="/chat/:matchId" element={renderProtected(<ChatPage user={user} handleLogout={handleLogout} />)} />
            <Route path="/profile" element={<ProfilePage user={user} setUser={setUser} handleLogout={handleLogout} />} />
            <Route path="/payments" element={<PaymentsPage user={user} handleLogout={handleLogout} />} />
            <Route path="/payments/success" element={<PaymentsPage user={user} handleLogout={handleLogout} />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="*" element={<Navigate to="/discover" />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/" />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;
