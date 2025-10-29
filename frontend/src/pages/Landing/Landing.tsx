import React from 'react';
import './Landing.css';
import { useNavigate } from 'react-router-dom';


const Landing: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="text-white" style={{ background: 'linear-gradient(to bottom right, #7345AF, #7345AF, #1E1E1E, #000000)', minHeight: '100vh' }}>
      {/* Header */}
      <header className="bg-dark px-8 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-dark rounded-full flex items-center justify-center">
              <img src="/assets/richflow.png" alt="RichFlow Logo" />
            </div>
            <span className="text-5xl font-bold text-gold">RichFlow</span>
          </div>
          
          {/* Navigation */}
          <nav className="flex gap-4">
            <button onClick={() => navigate('/login')} className="bg-purple text-gold px-8 py-3 rounded-2xl font-bold text-xl hover:bg-opacity-90 transition btn-hover-effect">
              Log in
            </button>
            <button onClick={() => navigate('/signup')} className="bg-purple text-gold px-8 py-3 rounded-2xl font-bold text-xl hover:bg-opacity-90 transition btn-hover-effect">
              Sign up
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ minHeight: 'calc(100vh - 96px)' }} className="flex items-center justify-center px-8 py-20">
        <div className="max-w-5xl mx-auto text-center">
          {/* Main Headline */}
          <h1 className="text-6xl md:text-7xl font-bold text-gold mb-8 leading-tight">
            See Where Your <span className="text-white">Money Flows</span> — and Make It Work for You.
          </h1>
          
          {/* Subheadline */}
          <p className="text-2xl text-gold italic font-light mb-12 max-w-3xl mx-auto">
            Understand where your money goes and learn how to make it work toward your financial goals.
          </p>
          
          {/* CTA Button */}
            <button onClick={() => navigate('/dashboard')}
            className="text-gold px-12 py-5 rounded-2xl ctext-3xl font-bold hover:bg-opacity-80 transition shadow-lg cta-button"
            style={{ background: 'linear-gradient(to bottom right, #7345AF, #7345AF, #1E1E1E, #000000)' }}
            >
            Get Started
            </button>
        </div>
      </main>
    </div>
  );
};

export default Landing;
