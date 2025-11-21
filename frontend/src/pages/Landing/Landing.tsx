import React from 'react';
import './Landing.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  
  return (
    <div className="text-white" style={{ background: 'linear-gradient(to bottom right, #7345AF, #7345AF, #1E1E1E, #000000)', minHeight: '100vh' }}>
      {/* Header */}
      <header className="landing-header bg-dark px-8 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="landing-logo-circle w-12 h-12 bg-dark rounded-full flex items-center justify-center">
              <img src="/assets/richflow.png" alt="RichFlow Logo" className="landing-logo-img" />
            </div>
            <span className="landing-logo-text text-5xl font-bold text-gold">RichFlow</span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="landing-nav-desktop flex gap-4">
            <button onClick={() => navigate('/login')} className="bg-purple text-gold px-8 py-3 rounded-2xl font-bold text-xl hover:bg-opacity-90 transition btn-hover-effect landing-nav-btn">
              { isAuthenticated ? 'Dashboard' : 'Log in'}
            </button>
            <button onClick={() => navigate('/signup')} className="bg-purple text-gold px-8 py-3 rounded-2xl font-bold text-xl hover:bg-opacity-90 transition btn-hover-effect landing-nav-btn">
              Sign up
            </button>
          </nav>

          {/* Mobile Hamburger Menu */}
          <button 
            className="landing-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`landing-hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
            <span className={`landing-hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
            <span className={`landing-hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <>
            <div className="landing-mobile-overlay" onClick={() => setMobileMenuOpen(false)}></div>
            <nav className="landing-nav-mobile">
              <button 
                onClick={() => { navigate('/login'); setMobileMenuOpen(false); }} 
                className="bg-purple text-gold px-6 py-3 rounded-xl font-bold text-lg hover:bg-opacity-90 transition btn-hover-effect w-full"
              >
                { isAuthenticated ? 'Dashboard' : 'Log in'}
              </button>
              <button 
                onClick={() => { navigate('/signup'); setMobileMenuOpen(false); }} 
                className="bg-purple text-gold px-6 py-3 rounded-xl font-bold text-lg hover:bg-opacity-90 transition btn-hover-effect w-full"
              >
                Sign up
              </button>
            </nav>
          </>
        )}
      </header>

      {/* Hero Section */}
      <main style={{ minHeight: 'calc(100vh - 96px)' }} className="flex items-center justify-center px-4 sm:px-8 py-12 sm:py-20">
        <div className="max-w-5xl mx-auto text-center">
          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gold mb-4 sm:mb-6 md:mb-8 leading-tight">
            See Where Your <span className="text-white">Money Flows</span> — and Make It Work for You.
          </h1>
          
          {/* Subheadline */}
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gold italic font-light mb-8 sm:mb-10 md:mb-12 max-w-3xl mx-auto px-4">
            Understand where your money goes and learn how to make it work toward your financial goals.
          </p>
          
          {/* CTA Button */}
            <button onClick={() => navigate('/signup')}
            className="text-gold px-6 sm:px-10 md:px-12 py-3 sm:py-4 md:py-5 rounded-2xl text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold hover:bg-opacity-80 transition shadow-lg cta-button"
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
