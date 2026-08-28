import React from 'react';

const StatCard = ({ title, value, icon: Icon, colorClass, subtitle }) => {
  return (
    <div className="card flex flex-col gap-4" style={{ padding: '1.5rem', borderRadius: '2px', transition: 'none' }}>
      <div className="flex justify-between items-center">
        <h3 className="text-muted font-bold text-sm uppercase m-0">{title}</h3>
        {Icon && (
          <div className={colorClass} style={{ padding: '4px', borderRadius: '2px', display: 'flex' }}>
            <Icon size={18} />
          </div>
        )}
      </div>
      <div>
        <div className="h1" style={{ lineHeight: 1 }}>{value}</div>
        {subtitle && <div className="text-xs text-muted mt-2 uppercase font-bold">{subtitle}</div>}
      </div>
    </div>
  );
};

export default StatCard;
