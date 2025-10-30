import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'

const Signup: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (!formData.username || !formData.email || !formData.password) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(formData.password);
    const hasLowerCase = /[a-z]/.test(formData.password);
    const hasNumber = /\d/.test(formData.password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      setError('Password must contain uppercase, lowercase, and numbers');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.username,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // Success - redirect or show success message
      console.log('User created successfully:', data.user);
      navigate('/login')
      alert('Account created successfully! You can now log in.');

      // Redirect to login page or clear form
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      });

    } catch (err: any) {
      setError(err.message || 'Something went wrong during signup');
    } finally {
      setLoading(false);
    }
  };

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
        {/* Box */}
        <form onSubmit={handleSubmit} className="bg-opacity-60 w-full h-full flex items-center justify-center flex-col gap-5 backdrop-blur-sm p-8 max-w-md mx-auto rounded bg-#171717">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 bg-dark rounded-full flex items-center justify-center">
              <img src="./assets/richflow.png" alt="RichFlow Logo" />
            </div>
            <span className="text-5xl font-bold text-gold">RichFlow</span>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="w-full p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}
          
          {/* Input Fields */}
          <div className="flex flex-col items-center justify-center gap-5 w-full max-w-md">
            <input 
              type="text" 
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              className="w-full h-[50px] px-6 rounded-lg bg-gray-300 text-gray-700 placeholder-gray-600 font-bold focus:outline-none focus:ring-2 focus:ring-purple input"
            />
            
            <input 
              type="email" 
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              className="w-full h-[50px] px-6 rounded-lg bg-gray-300 text-gray-700 placeholder-gray-600 font-bold focus:outline-none focus:ring-2 focus:ring-purple input"
              required
            />
            
            <input 
              type="password" 
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full h-[50px] px-6 rounded-lg bg-gray-300 text-gray-700 placeholder-gray-600 font-bold focus:outline-none focus:ring-2 focus:ring-purple input"
              required
            />
            
            <input 
              type="password" 
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full h-[50px] px-6 rounded-lg bg-gray-300 text-gray-700 placeholder-gray-600 font-bold focus:outline-none focus:ring-2 focus:ring-purple input"
              required
            />
            
            {/* Button */}
            <button 
              type="submit"
              disabled={loading}
              className="bg-purple w-[150px] h-[50px] text-gold px-8 py-3 rounded-2xl font-bold text-lg hover:bg-opacity-90 transition btn-hover-effect disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Sign Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;