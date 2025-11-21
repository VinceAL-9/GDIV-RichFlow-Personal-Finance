import React from 'react';
import './UserList.css';

interface User {
  id: number;
  name: string;
  email: string;
  lastLogin: string | null;
  createdAt: string;
}

interface UserListProps {
  users: User[];
  currentUserId?: number;
  onEdit?: (userId: number) => void;
  onDelete?: (userId: number) => void;
  onUserClick?: (userId: number, userName: string) => void;
}

const UserList: React.FC<UserListProps> = ({ users, currentUserId, onEdit, onDelete, onUserClick }) => {
  return (
    <div className="users-table-container">
      <table className="users-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Date of Creation</th>
            <th>Last Login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty-state">
                No users found
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr 
                key={user.id}
                className={onUserClick ? 'clickable-row' : ''}
                onClick={() => onUserClick?.(user.id, user.name)}
              >
                <td data-label="ID">{user.id}</td>
                <td data-label="Name">{user.name}</td>
                <td data-label="Email">{user.email}</td>
                <td data-label="Date of Creation">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </td>
                <td data-label="Last Login">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                </td>
                <td data-label="Actions">
                  {user.id !== currentUserId ? (
                    <button 
                      className="action-btn user-list-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.(user.id);
                      }}
                    >
                      Delete
                    </button>
                  ) : (
                    <span style={{ color: '#888', fontSize: '0.9rem' }}>You</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UserList;