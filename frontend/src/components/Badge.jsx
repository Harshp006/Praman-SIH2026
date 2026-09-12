import React from 'react';

const Badge = ({ children, variant = 'default', size = 'md' }) => {
  let bg, color, border;

  switch (variant) {
    case 'success': case 'pass': case 'approved': case 'low':
      bg = '#DCFCE7'; color = '#16A34A'; border = '#86EFAC';
      break;
    case 'warning': case 'warn': case 'pending_review': case 'flagged_for_review': case 'under_review': case 'medium':
      bg = '#FEF3C7'; color = '#D97706'; border = '#FCD34D';
      break;
    case 'danger': case 'fail': case 'rejected': case 'high':
      bg = '#FEE2E2'; color = '#DC2626'; border = '#FCA5A5';
      break;
    case 'missing': case 'na': default:
      bg = '#F1F5F9'; color = '#64748B'; border = '#CBD5E1';
  }

  const padding = size === 'sm' ? '2px 7px' : '3px 10px';
  const fontSize = size === 'sm' ? '0.65rem' : '0.72rem';

  return (
    <span
      className="badge"
      style={{
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
        padding,
        fontSize,
        borderRadius: '999px',
        fontWeight: 700,
        letterSpacing: '0.04em',
      }}
    >
      {children}
    </span>
  );
};

export default Badge;

