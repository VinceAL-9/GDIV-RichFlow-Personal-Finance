import React from 'react';

interface LockedAnalysisCardProps {
  /** Card title displayed in the header */
  title: string;
  /** Whether the user has PRO subscription */
  isPro: boolean;
  /** The real content to display for PRO users */
  children: React.ReactNode;
  /** Phantom/fake content to display blurred for FREE users */
  phantomContent: React.ReactNode;
  /** Optional: Feature description for the upgrade prompt */
  featureDescription?: string;
  /** Optional: Callback when user clicks upgrade */
  onUpgrade?: () => void;
}

/**
 * LockedAnalysisCard Component
 * 
 * A wrapper component that conditionally renders either:
 * - Real content for PRO users
 * - Blurred phantom content with upgrade overlay for FREE users
 * 
 * This creates a premium "teaser" experience that shows FREE users
 * what they're missing with beautiful blurred visualizations.
 */
const LockedAnalysisCard: React.FC<LockedAnalysisCardProps> = ({
  title,
  isPro,
  children,
  phantomContent,
  featureDescription = 'Unlock advanced financial insights',
  onUpgrade
}) => {
  // PRO users get the real content
  if (isPro) {
    return (
      <div className="rf-card">
        {/* Card Header */}
        <div className="rf-section-header-sm mb-4">
          <span className="flex items-center gap-2">
            <ProBadge />
            {title}
          </span>
        </div>
        
        {/* Real Content */}
        {children}
      </div>
    );
  }

  // FREE users get the blurred phantom content with overlay
  return (
    <div className="rf-card relative overflow-hidden">
      {/* Card Header */}
      <div className="rf-section-header-sm mb-4">
        <span className="flex items-center gap-2">
          <LockIcon />
          {title}
        </span>
      </div>

      {/* Blurred Phantom Content Container */}
      <div className="relative">
        {/* Phantom Content - Heavily Blurred */}
        <div 
          className="filter blur-md select-none pointer-events-none opacity-60"
          aria-hidden="true"
        >
          {phantomContent}
        </div>

        {/* Lock Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-6 py-4 rounded-xl bg-linear-to-br from-[#1a1a1a]/95 via-[#222]/90 to-[#1a1a1a]/95 backdrop-blur-sm border border-[#333] shadow-2xl max-w-xs">
            {/* Lock Icon with Glow */}
            <div className="relative inline-flex items-center justify-center w-14 h-14 mb-3">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-linear-to-r from-amber-500/30 to-orange-500/30 rounded-full blur-lg animate-pulse" />
              {/* Icon Container */}
              <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-linear-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                <svg 
                  className="w-6 h-6 text-amber-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                  />
                </svg>
              </div>
            </div>

            {/* Pro Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-3 rounded-full bg-linear-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
              <svg 
                className="w-3.5 h-3.5 text-amber-400" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" 
                  clipRule="evenodd" 
                />
              </svg>
              <span className="text-xs font-semibold text-amber-400 tracking-wide uppercase">
                Pro Feature
              </span>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              {featureDescription}
            </p>

            {/* Upgrade Button */}
            {onUpgrade && (
              <button
                onClick={onUpgrade}
                className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-linear-to-r from-amber-500 to-orange-500 text-white font-medium text-sm transition-all duration-200 hover:from-amber-400 hover:to-orange-400 hover:shadow-lg hover:shadow-amber-500/25 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <svg 
                  className="w-4 h-4 transition-transform group-hover:scale-110" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M13 10V3L4 14h7v7l9-11h-7z" 
                  />
                </svg>
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Lock Icon Component
 */
const LockIcon: React.FC = () => (
  <svg 
    className="w-5 h-5 text-gray-500" 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
    />
  </svg>
);

/**
 * Pro Badge Component
 */
const ProBadge: React.FC = () => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-linear-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30">
    <svg 
      className="w-3 h-3" 
      fill="currentColor" 
      viewBox="0 0 20 20"
    >
      <path 
        fillRule="evenodd" 
        d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" 
        clipRule="evenodd" 
      />
    </svg>
    PRO
  </span>
);

export default LockedAnalysisCard;
