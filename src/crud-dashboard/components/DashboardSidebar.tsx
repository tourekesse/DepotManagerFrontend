import * as React from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Toolbar from '@mui/material/Toolbar';
import { matchPath, useLocation } from 'react-router';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import Inventory2Icon from '@mui/icons-material/Inventory2';

import DashboardSidebarContext from '../context/DashboardSidebarContext';
import { DRAWER_WIDTH, MINI_DRAWER_WIDTH } from '../constants';
import DashboardSidebarPageItem from './DashboardSidebarPageItem';
import {
  getDrawerSxTransitionMixin,
  getDrawerWidthTransitionMixin,
} from '../mixins';
import { getMenuForCurrentRole } from '../../config/roleConfig';
import { fetchMenu } from '../../api/menuApi';

type MenuItem = {
  label: string;
  path: string;
  icon?: string;
};

export interface DashboardSidebarProps {
  expanded?: boolean;
  setExpanded: (expanded: boolean) => void;
  disableCollapsibleSidebar?: boolean;
  container?: Element;
}

export default function DashboardSidebar({
  expanded = true,
  setExpanded,
  disableCollapsibleSidebar = false,
  container,
}: DashboardSidebarProps) {
  const theme = useTheme();
  const { pathname } = useLocation();

  const [expandedItemIds, setExpandedItemIds] = React.useState<string[]>([]);
  const [menuItems, setMenuItems] = React.useState<MenuItem[]>(getMenuForCurrentRole());

  const isOverSmViewport = useMediaQuery(theme.breakpoints.up('sm'));
  const isOverMdViewport = useMediaQuery(theme.breakpoints.up('md'));

  const [isFullyExpanded, setIsFullyExpanded] = React.useState(expanded);
  const [isFullyCollapsed, setIsFullyCollapsed] = React.useState(!expanded);

  React.useEffect(() => {
    if (expanded) {
      const timeout = setTimeout(() => setIsFullyExpanded(true), theme.transitions.duration.enteringScreen);
      return () => clearTimeout(timeout);
    }
    setIsFullyExpanded(false);
  }, [expanded, theme.transitions.duration.enteringScreen]);

  React.useEffect(() => {
    if (!expanded) {
      const timeout = setTimeout(() => setIsFullyCollapsed(true), theme.transitions.duration.leavingScreen);
      return () => clearTimeout(timeout);
    }
    setIsFullyCollapsed(false);
  }, [expanded, theme.transitions.duration.leavingScreen]);

  React.useEffect(() => {
    const roleMenu = getMenuForCurrentRole();
    setMenuItems(roleMenu);
    const role = localStorage.getItem('role') || (JSON.parse(localStorage.getItem('dmUser') || '{}').role);
    if (role) {
      fetchMenu(role)
        .then((apiMenu) => {
          if (apiMenu && apiMenu.length) setMenuItems(apiMenu);
        })
        .catch(() => {});
    }
  }, []);

  const mini = !disableCollapsibleSidebar && !expanded;

  const handleSetSidebarExpanded = React.useCallback(
    (newExpanded: boolean) => () => setExpanded(newExpanded),
    [setExpanded],
  );

  const handlePageItemClick = React.useCallback(
    (itemId: string, hasNestedNavigation: boolean) => {
      if (hasNestedNavigation && !mini) {
        setExpandedItemIds((prev) =>
          prev.includes(itemId)
            ? prev.filter((id) => id !== itemId)
            : [...prev, itemId],
        );
      } else if (!isOverSmViewport && !hasNestedNavigation) {
        setExpanded(false);
      }
    },
    [mini, setExpanded, isOverSmViewport],
  );

  const hasDrawerTransitions =
    isOverSmViewport && (!disableCollapsibleSidebar || isOverMdViewport);

  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Dashboard': return <DashboardIcon />;
      case 'ShoppingCart': return <ShoppingCartIcon />;
      case 'Inventory': return <InventoryIcon />;
      case 'Inventory2': return <Inventory2Icon />;
      case 'Add': return <AddIcon />;
      case 'History': return <HistoryIcon />;
      default: return <DashboardIcon />;
    }
  };

  const getDrawerContent = React.useCallback(
    (viewport: 'phone' | 'tablet' | 'desktop') => (
      <>
        <Toolbar />
        <Box
          component="nav"
          aria-label={`${viewport.charAt(0).toUpperCase()}${viewport.slice(1)}`}
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'auto',
            scrollbarGutter: mini ? 'stable' : 'auto',
            overflowX: 'hidden',
            pt: !mini ? 0 : 2,
            ...(hasDrawerTransitions
              ? getDrawerSxTransitionMixin(isFullyExpanded, 'padding')
              : {}),
          }}
        >
          <List
            dense
            sx={{
              padding: mini ? 0 : 0.5,
              mb: 4,
              width: mini ? MINI_DRAWER_WIDTH : 'auto',
            }}
          >
            {menuItems.map((item) => (
              <DashboardSidebarPageItem
                key={item.path}
                id={item.path.replace(/\//g, '-')}
                title={item.label}
                icon={getIcon(item.icon)}
                href={item.path}
                selected={!!matchPath(item.path + '/*', pathname) || pathname === item.path}
              />
            ))}
          </List>
        </Box>
      </>
    ),
    [mini, hasDrawerTransitions, isFullyExpanded, menuItems, pathname],
  );

  const getDrawerSharedSx = React.useCallback(
    (isTemporary: boolean) => {
      const drawerWidth = mini ? MINI_DRAWER_WIDTH : DRAWER_WIDTH;

      return {
        displayPrint: 'none',
        width: drawerWidth,
        flexShrink: 0,
        ...getDrawerWidthTransitionMixin(expanded),
        ...(isTemporary ? { position: 'absolute' } : {}),
        '& .MuiDrawer-paper': {
          position: isTemporary ? 'absolute' : 'relative',
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundImage: 'none',
          zIndex: 1300,
          ...getDrawerWidthTransitionMixin(expanded),
        },
      };
    },
    [expanded, mini],
  );

  return (
    <DashboardSidebarContext.Provider
      value={{
        onPageItemClick: handlePageItemClick,
        mini,
        fullyExpanded: isFullyExpanded,
        fullyCollapsed: isFullyCollapsed,
        hasDrawerTransitions,
      }}
    >
      {/* ✅ MOBILE */}
      <Drawer
        container={container}
        variant="temporary"
        open={expanded}
        onClose={handleSetSidebarExpanded(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: disableCollapsibleSidebar ? 'block' : 'none', md: 'none' },
          zIndex: 1300,
          ...getDrawerSharedSx(true),
        }}
      >
        {getDrawerContent('phone')}
      </Drawer>

      {/* ✅ TABLETTE */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: disableCollapsibleSidebar ? 'none' : 'block', md: 'none' },
          zIndex: 1300,
          ...getDrawerSharedSx(false),
        }}
      >
        {getDrawerContent('tablet')}
      </Drawer>

      {/* ✅ DESKTOP — rétractable */}
      <Drawer
        variant="persistent"
        open={expanded}
        sx={{
          display: { xs: 'none', md: 'block' },
          zIndex: 1300,
          position: 'relative',
          ...getDrawerSharedSx(false),
        }}
      >
        {getDrawerContent('desktop')}
      </Drawer>
    </DashboardSidebarContext.Provider>
  );
}
