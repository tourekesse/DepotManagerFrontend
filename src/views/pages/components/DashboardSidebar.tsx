import * as React from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Toolbar from '@mui/material/Toolbar';
import PersonIcon from '@mui/icons-material/Person';
import BarChartIcon from '@mui/icons-material/BarChart';
import DescriptionIcon from '@mui/icons-material/Description';
import LayersIcon from '@mui/icons-material/Layers';
import { matchPath, useLocation } from 'react-router';
import DashboardSidebarContext from '../context/DashboardSidebarContext';
import { DRAWER_WIDTH, MINI_DRAWER_WIDTH } from '../constants';
import DashboardSidebarPageItem from './DashboardSidebarPageItem';
import DashboardSidebarHeaderItem from './DashboardSidebarHeaderItem';
import DashboardSidebarDividerItem from './DashboardSidebarDividerItem';
import {
  getDrawerSxTransitionMixin,
  getDrawerWidthTransitionMixin,
} from '../mixins';

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
            <DashboardSidebarPageItem
              id="employees"
              title="Employees"
              icon={<PersonIcon />}
              href="/accueil/employees"
              selected={!!matchPath('/accueil/employees/*', pathname)}
            />

            <DashboardSidebarDividerItem />

            <DashboardSidebarHeaderItem>Example items</DashboardSidebarHeaderItem>

            <DashboardSidebarPageItem
              id="reports"
              title="Reports"
              icon={<BarChartIcon />}
              href="/accueil/reports"
              selected={!!matchPath('/accueil/reports', pathname)}
              defaultExpanded={!!matchPath('/accueil/reports', pathname)}
              expanded={expandedItemIds.includes('reports')}
              nestedNavigation={
                <List dense sx={{ padding: 0, my: 1, pl: mini ? 0 : 1, minWidth: 240 }}>
                  <DashboardSidebarPageItem
                    id="sales"
                    title="Sales"
                    icon={<DescriptionIcon />}
                    href="/accueil/reports/sales"
                    selected={!!matchPath('/accueil/reports/sales', pathname)}
                  />
                  <DashboardSidebarPageItem
                    id="traffic"
                    title="Traffic"
                    icon={<DescriptionIcon />}
                    href="/accueil/reports/traffic"
                    selected={!!matchPath('/accueil/reports/traffic', pathname)}
                  />
                </List>
              }
            />

            <DashboardSidebarPageItem
              id="integrations"
              title="Integrations"
              icon={<LayersIcon />}
              href="/accueil/integrations"
              selected={!!matchPath('/accueil/integrations', pathname)}
            />
          </List>
        </Box>
      </>
    ),
    [mini, hasDrawerTransitions, isFullyExpanded, expandedItemIds, pathname],
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
        setExpanded,
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
