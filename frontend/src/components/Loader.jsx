import React from 'react';

const Loader = ({ center = false, text = 'Loading...' }) => {
  const content = (
    <div className="flex items-center gap-2 text-muted">
      <div className="spinner"></div>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );

  if (center) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        {content}
      </div>
    );
  }

  return content;
};

export default Loader;
