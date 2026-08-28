import React from 'react';

const Badge = ({ children, variant = 'default', size = 'md' }) => {
  let bg, color, border;
  
  switch (variant) {
    case 'success':
    case 'pass':
    case 'approved':
    case 'low':
      bg = 'var(--success-light)';
      color = 'var(--success-text)';
      border = 'var(--success-border)';
      break;
    case 'warning':
    case 'warn':
    case 'under_review':
    case 'medium':
      bg = 'var(--warning-light)';
      color = 'var(--warning-text)';
      border = 'var(--warning-border)';
      break;
    case 'danger':
    case 'fail':
    case 'rejected':
    case 'high':
      bg = 'var(--danger-light)';
      color = 'var(--danger-text)';
      border = 'var(--danger-border)';
      break;
    case 'missing':
    case 'na':
    default:
      bg = 'var(--bg-subtle)';
      color = 'var(--text-muted)';
      border = 'var(--border-light)';
  }

  const padding = size === 'sm' ? '0.125rem 0.5rem' : '0.25rem 0.625rem';
  const fontSize = size === 'sm' ? '0.65rem' : '0.75rem';

  return (
    <span 
      className="badge" 
      style={{ 
        backgroundColor: bg, 
        color, 
        border: `1px solid ${border}`,
        padding,
        fontSize
      }}
    >
      {children}
    </span>
  );
};

export default Badge;
