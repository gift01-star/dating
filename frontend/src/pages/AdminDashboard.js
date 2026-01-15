import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL;

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [unverifiedUsers, setUnverifiedUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [activeTab, setActiveTab] = useState('stats');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('token');

      const [statsRes, usersRes, reportsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/admin/users/unverified`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/admin/reports`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setStats(statsRes.data);
      setUnverifiedUsers(usersRes.data);
      setReports(reportsRes.data);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');

      await axios.put(`${API_URL}/admin/users/${userId}/verify`, 
        { verificationMethod: 'manual' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUnverifiedUsers(prev => prev.filter(u => u._id !== userId));
    } catch (err) {
      console.error('Error verifying user:', err);
    }
  };

  const handleBanUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');

      await axios.put(`${API_URL}/admin/users/${userId}/ban`, {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUnverifiedUsers(prev => prev.filter(u => u._id !== userId));
    } catch (err) {
      console.error('Error banning user:', err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/discover')}
            className="text-gray-600 hover:text-gray-800"
          >
            <FaArrowLeft size={24} />
          </button>
          <h1 className="text-4xl font-bold text-gray-800">Admin Dashboard</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('stats')}
            className={`pb-2 font-medium ${
              activeTab === 'stats'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-gray-600'
            }`}
          >
            Statistics
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-2 font-medium ${
              activeTab === 'users'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-gray-600'
            }`}
          >
            Unverified Users ({unverifiedUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`pb-2 font-medium ${
              activeTab === 'reports'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-gray-600'
            }`}
          >
            Reports ({reports.length})
          </button>
        </div>

        {/* Statistics Tab */}
        {activeTab === 'stats' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-600 text-sm font-medium">Total Users</h3>
              <p className="text-3xl font-bold text-gray-800 mt-2">{stats.totalUsers}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-600 text-sm font-medium">Verified Users</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.verifiedUsers}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-600 text-sm font-medium">Pending Reports</h3>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pendingReports}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-gray-600 text-sm font-medium">Banned Users</h3>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.bannedUsers}</p>
            </div>
          </div>
        )}

        {/* Unverified Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {unverifiedUsers.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No unverified users
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">University</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {unverifiedUsers.map(user => (
                    <tr key={user._id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-800">{user.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.university || '-'}</td>
                      <td className="px-6 py-4 text-right text-sm space-x-2">
                        <button
                          onClick={() => handleVerifyUser(user._id)}
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          Verify
                        </button>
                        <button
                          onClick={() => handleBanUser(user._id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Ban
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {reports.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No reports
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Reported User</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Reason</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Reported At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(report => (
                      <tr key={report._id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-800">
                          {report.reportedUser?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{report.reason}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            report.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : report.status === 'resolved'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
