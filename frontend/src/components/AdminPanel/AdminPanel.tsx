import React, { useEffect, useState } from 'react';
import './AdminPanel.css';
import UserList from '../UserList/UserList';
import AdminUserFinancialView from '../AdminUserFinancialView/AdminUserFinancialView';
import { adminAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

interface User {
  id: number;
  name: string;
  email: string;
  lastLogin: string | null;
  createdAt: string;
}

const AdminPanel: React.FC = () => {
  const { loading: authLoading, isAuthenticated, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');

  // Fetch users from the database
  useEffect(() => {
    // Wait for auth to finish loading before fetching users
    if (authLoading || !isAuthenticated) {
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await adminAPI.getUsers();
        
        // Transform the API response to match the User interface
        const transformedUsers = response.users.map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        }));
        
        setUsers(transformedUsers);
        setFilteredUsers(transformedUsers);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [authLoading, isAuthenticated]);

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.id.toString().includes(query)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleEdit = (userId: number) => {
    console.log('Edit user:', userId);
    // Add your edit logic here
  };

  const handleDelete = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await adminAPI.deleteUser(userId);
      // Remove the deleted user from the state
      const updatedUsers = users.filter(user => user.id !== userId);
      setUsers(updatedUsers);
      setFilteredUsers(updatedUsers.filter(user => 
        !searchQuery.trim() || 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.id.toString().includes(searchQuery)
      ));
      alert('User deleted successfully');
    } catch (err) {
      console.error('Delete user error:', err);
      alert('Failed to delete user. Please try again.');
    }
  };

  const handleUserClick = (userId: number, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
  };

  const handleBackToUserList = () => {
    setSelectedUserId(null);
    setSelectedUserName('');
  };

  // If a user is selected, show their financial data
  if (selectedUserId !== null) {
    return (
      <AdminUserFinancialView
        userId={selectedUserId}
        userName={selectedUserName}
        onBack={handleBackToUserList}
      />
    );
  }

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h2 className="admin-title">Users</h2>
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, email, or ID..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      <div className="admin-content">
        {authLoading || loading ? (
          <div className="loading-message">Loading users...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <UserList 
            users={filteredUsers}
            currentUserId={user?.id ? Number(user.id) : undefined}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onUserClick={handleUserClick}
          />
        )}
      </div>
    </section>
  );
};

export default AdminPanel;