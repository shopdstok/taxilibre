import React from 'react';

const DropdownMenu = ({ children }: { children?: React.ReactNode }) => {
  return <div className="dropdown-menu">{children}</div>;
};

export default DropdownMenu;
