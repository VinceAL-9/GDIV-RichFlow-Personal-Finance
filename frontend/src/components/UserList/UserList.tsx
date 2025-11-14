import React from 'react';
import './UserList.css';

interface User {
  id: number;
  name: string;
  email: string;
  lastOnline: string | null;
  joinedDate: string;
}

interface UserListProps {
  users: User[];
  currentUserId?: number;
  onEdit?: (userId: number) => void;
  onDelete?: (userId: number) => void;
}

const UserList: React.FC<UserListProps> = ({ users, currentUserId, onEdit, onDelete }) => {
  return (
    <div className="users-table-container">
      <table className="users-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Last Online</th>
            <th>Joined Date</th>
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
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  {user.lastOnline ? new Date(user.lastOnline).toLocaleDateString() : 'Never'}
                </td>
                <td>{new Date(user.joinedDate).toLocaleDateString()}</td>
                <td>
                  {user.id !== currentUserId ? (
                    <button 
                      className="action-btn user-list-delete-btn"
                      onClick={() => onDelete?.(user.id)}
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