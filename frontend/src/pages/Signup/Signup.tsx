import React from 'react';
import './Signup.css';


const Signup: React.FC = () => {
  return (
    <div className="text-white" style={{ background: 'linear-gradient(to bottom right, #7345AF, #7345AF, #1E1E1E, #000000)', minHeight: '100vh' }}>
  <div className="max-w-7xl mx-auto p-8 flex items-center justify-center" style={{ minHeight: '100vh' }}>
    
    {/* Box */}
    <div className="bg-opacity-60 backdrop-blur-sm p-8 max-w-md mx-auto rounded" style={{ backgroundColor: '#171717' }}>
      <div className="flex items-center gap-3 mb-8 justify-center">
        <div className="w-12 h-12 bg-dark rounded-full flex items-center justify-center">
          <img src="/assets/richflow.png" alt="RichFlow Logo" />
        </div>
        <span className="text-5xl font-bold text-gold">RichFlow</span>
      </div>
      
      {/* Input Fields */}
      <div className="space-y-5">
        <input 
          type="text" 
          placeholder="Username"
          className="w-full px-4 py-3 rounded bg-gray-300 text-gray-700 placeholder-gray-600 font-bold focus:outline-none focus:ring-2 focus:ring-purple"
        />
        
        <input 
          type="password" 
          placeholder="Password"
          className="w-full px-4 py-3 rounded bg-gray-300 text-gray-700 placeholder-gray-600 font-bold focus:outline-none focus:ring-2 focus:ring-purple"
        />
        
        <input 
          type="password" 
          placeholder="Confirm Password"
          className="w-full px-4 py-3 rounded bg-gray-300 text-gray-700 placeholder-gray-600 font-bold focus:outline-none focus:ring-2 focus:ring-purple"
        />
        
        <input 
          type="email" 
          placeholder="Email Address"
          className="w-full px-4 py-3 rounded bg-gray-300 text-gray-700 placeholder-gray-600 font-bold focus:outline-none focus:ring-2 focus:ring-purple"
        />
        
        {/* Button */}
        <div className="flex justify-center pt-4">
          <button className="bg-purple text-gold px-8 py-3 rounded font-bold text-lg hover:bg-opacity-90 transition btn-hover-effect">
            Sign up
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
  );
};

export default Signup;
