import * as React from 'react';

export interface DashboardSidebarContextType {
  onPageItemClick: (itemId: string, hasNestedNavigation: boolean) => void;
  mini: boolean;
  fullyExpanded: boolean;
  fullyCollapsed: boolean;
  hasDrawerTransitions: boolean;
  setExpanded?: (expanded: boolean) => void;
}

const DashboardSidebarContext = React.createContext<DashboardSidebarContextType | undefined>(
  undefined,
);

export default DashboardSidebarContext;
