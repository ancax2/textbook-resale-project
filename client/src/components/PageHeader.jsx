import React from 'react';

function PageHeader({ title, subtitle, children }) {
  return (
    <div className="app-page-header">
      <h1 className="h2">{title}</h1>
      {subtitle && <p className="text-muted small mb-0">{subtitle}</p>}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}

export default PageHeader;
