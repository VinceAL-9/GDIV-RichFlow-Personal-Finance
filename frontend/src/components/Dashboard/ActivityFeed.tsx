import React from 'react';
import {
  useActivityFeed,
  formatRelativeTime,
  formatEventDescription,
  getEntityIcon,
  getActionColor,
  ActivityEvent,
} from '../../hooks/queries/useActivityFeed';

interface ActivityFeedProps {
  /** Number of events to display */
  limit?: number;
  /** Optional title override */
  title?: string;
  /** Whether to show the title header */
  showTitle?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * ActivityFeed Component
 * 
 * Displays a vertical timeline of recent financial events,
 * aligned with the RichFlow "Time Machine" concept.
 */
const ActivityFeed: React.FC<ActivityFeedProps> = ({
  limit = 10,
  title = 'Recent Activity',
  showTitle = true,
  className = '',
}) => {
  const { data: events, isLoading, error } = useActivityFeed(limit);

  if (isLoading) {
    return (
      <div className={`activity-feed ${className}`.trim()}>
        {showTitle && (
          <div className="rf-section-header-sm">{title}</div>
        )}
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse text-(--color-gold)">
            Loading activity...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`activity-feed ${className}`.trim()}>
        {showTitle && (
          <div className="rf-section-header-sm">{title}</div>
        )}
        <div className="text-center py-4 text-red-400 text-sm">
          Failed to load activity
        </div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className={`activity-feed ${className}`.trim()}>
        {showTitle && (
          <div className="rf-section-header-sm">{title}</div>
        )}
        <div className="text-center py-8 text-(--color-text-dim) text-sm">
          No recent activity
        </div>
      </div>
    );
  }

  return (
    <div className={`activity-feed ${className}`.trim()}>
      {showTitle && (
        <div className="rf-section-header-sm">{title}</div>
      )}
      
      {/* Timeline container */}
      <div className="relative">
        {/* Vertical timeline line */}
        <div 
          className="absolute left-4 top-0 bottom-0 w-px"
          style={{ backgroundColor: 'var(--color-border)' }}
        />
        
        {/* Event list */}
        <ul className="space-y-1">
          {events.map((event: ActivityEvent) => (
            <ActivityItem 
              key={event.id} 
              event={event}
            />
          ))}
        </ul>
      </div>
    </div>
  );
};

/**
 * Individual activity item in the timeline
 */
const ActivityItem: React.FC<{ event: ActivityEvent }> = ({ 
  event
}) => {
  const icon = getEntityIcon(event.entityType, event.actionType);
  const actionColorClass = getActionColor(event.actionType);
  const description = formatEventDescription(event);
  const timeAgo = formatRelativeTime(event.timestamp);

  return (
    <li className="relative pl-10 pb-4">
      {/* Timeline dot */}
      <div 
        className="absolute left-2 top-1 w-5 h-5 rounded-full flex items-center justify-center text-xs"
        style={{ 
          backgroundColor: 'var(--color-card)',
          border: '2px solid var(--color-purple)',
        }}
        title={event.entityType}
      >
        {icon}
      </div>
      
      {/* Event content */}
      <div 
        className="rounded-lg p-3 transition-all hover:translate-x-1"
        style={{ 
          backgroundColor: 'rgba(115, 69, 175, 0.1)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Description */}
        <p 
          className={`text-sm font-medium ${actionColorClass}`}
          style={{ color: 'var(--color-purple-lighter)' }}
        >
          <span className={actionColorClass}>
            {event.actionType === 'CREATE' && '+ '}
            {event.actionType === 'DELETE' && '- '}
            {event.actionType === 'UPDATE' && '↻ '}
          </span>
          {description}
        </p>
        
        {/* Timestamp */}
        <p 
          className="text-xs mt-1"
          style={{ color: 'var(--color-text-dim)' }}
        >
          {timeAgo}
        </p>
        
        {/* Value change indicator for updates */}
        {event.actionType === 'UPDATE' && event.beforeValue && event.afterValue && (
          <ValueChange before={event.beforeValue} after={event.afterValue} />
        )}
      </div>
    </li>
  );
};

/**
 * Shows value changes for UPDATE events
 */
const ValueChange: React.FC<{ 
  before: Record<string, unknown>; 
  after: Record<string, unknown>; 
}> = ({ before, after }) => {
  // Determine what changed
  const beforeAmount = before.amount ?? before.value;
  const afterAmount = after.amount ?? after.value;
  
  if (beforeAmount !== undefined && afterAmount !== undefined && beforeAmount !== afterAmount) {
    const increased = Number(afterAmount) > Number(beforeAmount);
    return (
      <p 
        className={`text-xs mt-1 ${increased ? 'text-green-400' : 'text-red-400'}`}
      >
        {increased ? '↑' : '↓'} Value changed
      </p>
    );
  }
  
  // Check for name change
  if (before.name && after.name && before.name !== after.name) {
    return (
      <p className="text-xs mt-1 text-yellow-400">
        Renamed from "{String(before.name)}"
      </p>
    );
  }
  
  return null;
};

export default ActivityFeed;
