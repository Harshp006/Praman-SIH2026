import React from 'react';

const StatCard = ({ title, value, icon: Icon, colorClass, subtitle }) => {
  return (
    <div className="card card-hoverable p-4 flex flex-col gap-4" style={{ padding: '1.5rem' }}>
      <div className="flex justify-between items-center">
        <h3 className="text-muted font-medium text-sm m-0">{title}</h3>
        {Icon && (
          <div className={colorClass} style={{ padding: '8px', borderRadius: '8px', display: 'flex' }}>
            <Icon size={20} />
          </div>
        )}
      </div>
      <div>
        <div className="h1" style={{ lineHeight: 1 }}>{value}</div>
        {subtitle && <div className="text-xs text-muted mt-2">{subtitle}</div>}
      </div>
    </div>
  );
};

export default StatCard;
