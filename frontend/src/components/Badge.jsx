import React from 'react';

const Badge = ({ children, variant = 'default', size = 'md' }) => {
  let bg, color, border;
  
  switch (variant) {
    case 'success':
    case 'pass':
    case 'approved':
    case 'low':
      bg = 'var(--status-approved)';
      color = '#fff';
      border = 'transparent';
      break;
    case 'warning':
    case 'warn':
    case 'pending_review':
    case 'under_review':
    case 'medium':
      bg = 'var(--status-pending)';
      color = '#fff';
      border = 'transparent';
      break;
    case 'danger':
    case 'fail':
    case 'rejected':
    case 'high':
      bg = 'var(--status-rejected)';
      color = '#fff';
      border = 'transparent';
      break;
    case 'missing':
    case 'na':
    default:
      bg = 'var(--surface-muted)';
      color = 'var(--text-primary)';
      border = 'var(--border)';
  }

  const padding = size === 'sm' ? '2px 6px' : '4px 8px';
  const fontSize = size === 'sm' ? '0.65rem' : '0.75rem';

  return (
    <span 
      className="badge" 
      style={{ 
        backgroundColor: bg, 
        color, 
        border: border !== 'transparent' ? `1px solid ${border}` : 'none',
        padding,
        fontSize,
        borderRadius: '2px'
      }}
    >
      {children}
    </span>
  );
};

export default Badge;
