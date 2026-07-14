import React, { useState, useEffect } from 'react';
import { userAPI } from '../services/api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/v1/admin/users', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setUsers(data.data || []);
        } else {
          throw new Error('Failed to fetch users');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="flex items-center justify-content h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">User Management</h1>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Role</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">{user.name || 'N/A'}</td>
                  <td className="px-6 py-4">{user.email || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className={`text-sm ${user.role === 'driver' ? 'text-blue-600' : 'text-green-600'}`}>
                      {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} px-3 py-1 rounded-full text-sm`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => viewUser(user.id)}
                      className="text-blue-600 hover:text-blue-700 mr-3"
                    >
                      View
                    </button>
                    {!user.isActive ? (
                      <button
                        onClick={() => activateUser(user.id)}
                        className="text-green-600 hover:text-green-700 mr-3"
                      >
                        Activate
                      </button>
                    ) : (
                      <button
                        onClick={() => deactivateUser(user.id)}
                        className="text-red-600 hover:text-red-700 mr-3"
                      >
                        Deactivate
                      </button>
                    )}
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colspan="5" className="px-6 py-4 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Helper functions (in a real app, these would call API endpoints)
const viewUser = (id) => {
  alert(`Viewing user ${id}`);
  // Implement view user functionality
};

const activateUser = async (id) => {
  try {
    const response = await fetch(`/api/v1/admin/users/${id}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      }
    });
    if (response.ok) {
      alert('User activated successfully');
      // Refresh the user list
      window.location.reload();
    } else {
      throw new Error('Failed to activate user');
    }
  } catch (error) {
    alert(`Error activating user: ${error.message}`);
  }
};

const deactivateUser = async (id) => {
  try {
    const response = await fetch(`/api/v1/admin/users/${id}/deactivate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      }
    });
    if (response.ok) {
      alert('User deactivated successfully');
      // Refresh the user list
      window.location.reload();
    } else {
      throw new Error('Failed to deactivate user');
    }
  } catch (error) {
    alert(`Error deactivating user: ${error.message}`);
  }
};

const deleteUser = async (id) => {
  if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
    try {
      const response = await fetch(`/api/v1/admin/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (response.ok) {
        alert('User deleted successfully');
        // Refresh the user list
        window.location.reload();
      } else {
        throw new Error('Failed to delete user');
      }
    } catch (error) {
      alert(`Error deleting user: ${error.message}`);
    }
  }
};
