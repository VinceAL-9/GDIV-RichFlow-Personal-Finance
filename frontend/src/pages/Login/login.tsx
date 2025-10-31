import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      // Navigate to dashboard after successful login
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking session
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'linear-gradient(to bottom right, #7345AF, #7345AF, #1E1E1E, #000000)' }}>
        <div className="text-gold text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div 
      className="text-white w-screen h-screen flex items-center justify-center" 
      style={{ background: 'linear-gradient(to bottom right, #7345AF, #7345AF, #1E1E1E, #000000)' }}
    >
      <div 
        className="bg-opacity-60 backdrop-blur-sm rounded-lg flex items-center justify-center flex-col gap-7 p-8" 
        style={{ 
          backgroundColor: '#171717',
          width: '40vw',
          height: '80vh',
          boxSizing: 'border-box'
        }}
      >
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 bg-dark rounded-full flex items-center justify-center">
            <img src="/assets/richflow.png" alt="RichFlow Logo" />
          </div>
          <span className="text-5xl font-bold text-gold">RichFlow</span>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col items-center justify-center gap-5 w-full max-w-md">
          {error && (
            <div className="w-full p-3 bg-red-500 bg-opacity-20 text-red-300 rounded-lg text-center">
              {error}
            </div>
          )}
          
          <input 
            type="email" 
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-[50px] px-6 rounded-lg bg-gray-300 text-gray-700 placeholder-gray-600 font-bold focus:outline-none focus:ring-2 focus:ring-purple input"
            required
          />

          <input 
            type="password" 
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-[50px] px-4 py-3 rounded-lg bg-gray-300 text-gray-700 placeholder-gray-600 font-bold focus:outline-none focus:ring-2 focus:ring-purple input"
            required
          />

          <button 
            type="submit"
            disabled={isLoading}
            className={`bg-purple w-[150px] h-[50px] text-gold px-8 py-3 rounded-2xl font-bold text-lg hover:bg-opacity-90 transition btn-hover-effect ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Loading...' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;