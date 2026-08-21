import * as React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PeopleIcon from '@mui/icons-material/People';
import Toolbar from '@mui/material/Toolbar';

import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import { matchPath, useLocation } from 'react-router-dom';

import DashboardSidebarContext from '../context/DashboardSidebarContext';
import { DRAWER_WIDTH, MINI_DRAWER_WIDTH } from '../constants';

import DashboardSidebarPageItem from './DashboardSidebarPageItem';
import DashboardSidebarHeaderItem from './DashboardSidebarHeaderItem';

import { fetchMenu } from '../../api/menuApi';

import {
  getDrawerSxTransitionMixin,
  getDrawerWidthTransitionMixin,
} from '../mixins';

function DashboardSidebar({
  expanded = true,
  setExpanded,
  disableCollapsibleSidebar = false,
  container,
}) {
  const theme = useTheme();
  const { pathname } = useLocation();

  const isOverSmViewport = useMediaQuery(theme.breakpoints.up('sm'));
  const isOverMdViewport = useMediaQuery(theme.breakpoints.up('md'));

  const [isFullyExpanded, setIsFullyExpanded] = React.useState(expanded);
  const [isFullyCollapsed, setIsFullyCollapsed] = React.useState(!expanded);

  React.useEffect(() => {
    if (expanded) {
      const timeout = setTimeout(
        () => setIsFullyExpanded(true),
        theme.transitions.duration.enteringScreen
      );
      return () => clearTimeout(timeout);
    }
    setIsFullyExpanded(false);
  }, [expanded, theme.transitions.duration.enteringScreen]);

  React.useEffect(() => {
    if (!expanded) {
      const timeout = setTimeout(
        () => setIsFullyCollapsed(true),
        theme.transitions.duration.leavingScreen
      );
      return () => clearTimeout(timeout);
    }
    setIsFullyCollapsed(false);
  }, [expanded, theme.transitions.duration.leavingScreen]);

  const mini = !disableCollapsibleSidebar && !expanded;

  const handleSetSidebarExpanded = React.useCallback(
    (newExpanded) => () => setExpanded(newExpanded),
    [setExpanded]
  );

  const hasDrawerTransitions =
    isOverSmViewport && (!disableCollapsibleSidebar || isOverMdViewport);

  const [menuItems, setMenuItems] = React.useState([]);

  React.useEffect(() => {
    const dmUser = JSON.parse(localStorage.getItem('dmUser') || '{}');
    const role = dmUser.role || localStorage.getItem('role');
    const userId = dmUser.userId;
    fetchMenu(role, userId).then((apiMenu) => {
      if (apiMenu && apiMenu.length) setMenuItems(apiMenu);
    }).catch(() => {});
  }, []);

  const getDrawerContent = React.useCallback(
    (viewport) => {
      // Mapping des icons pour chaque menu item
      const iconMap = {
        'Tableau de bord': <DashboardIcon />,
        Clients: <PeopleIcon />,
        'Nouveau produit': <InventoryIcon />,
        Produits: <InventoryIcon />,
        Approvisionnement: <LocalShippingIcon />,
        'Commandes en attente': <ShoppingCartIcon />,
        'Nouvelle commande': <ShoppingCartIcon />,
        'Historique commandes': <ShoppingCartIcon />,
        'Mes commandes': <ShoppingCartIcon />,
        'Mes casiers': <Inventory2Icon />,
        'Mes livraisons': <LocalShippingIcon />,
        Livraisons: <LocalShippingIcon />,
        Collaborateurs: <LocalShippingIcon />,
        Caisse: <AccountBalanceWalletIcon />,
        Ventes: <ShoppingCartIcon />,
        Historique: <LocalShippingIcon />,
        'Centre d\'aide': <HelpOutlineIcon />,
      };

      return (
        <>
          <Toolbar />
          <Box
            component="nav"
            aria-label={`${viewport.charAt(0).toUpperCase()}${viewport.slice(1)}`}
            sx={{
              height: '100%',
              overflow: 'auto',
              overflowX: 'hidden',
              pt: mini ? 2 : 0,
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
              {/* Affiche les items de menu basés sur le rôle */}
              {menuItems.map((item) => (
                <DashboardSidebarPageItem
                  key={item.path}
                  id={item.path.replace(/\//g, '-')}
                  title={item.label}
                  icon={iconMap[item.label] || <DashboardIcon />}
                  href={item.path}
                  selected={!!matchPath(item.path + '/*', pathname) || pathname === item.path}
                />
              ))}

              {/* Centre d'aide - toujours visible */}
              <DashboardSidebarPageItem
                key="documentation"
                id="documentation"
                title="Centre d'aide"
                icon={<HelpOutlineIcon />}
                href="/accueil/documentation"
                selected={!!matchPath('/accueil/documentation/*', pathname) || pathname === '/accueil/documentation'}
              />
            </List>
          </Box>
        </>
      );
    },
    [mini, hasDrawerTransitions, isFullyExpanded, pathname]
  );

  const getDrawerSharedSx = React.useCallback(
    (isTemporary) => {
      const drawerWidth = mini ? MINI_DRAWER_WIDTH : DRAWER_WIDTH;

      return {
        displayPrint: 'none',
        width: drawerWidth,
        flexShrink: 0,
        ...getDrawerWidthTransitionMixin(expanded),
        ...(isTemporary ? { position: 'absolute' } : {}),
        '& .MuiDrawer-paper': {
          position: 'absolute',
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundImage: 'none',
          ...getDrawerWidthTransitionMixin(expanded),
        },
      };
    },
    [expanded, mini]
  );

  const sidebarContextValue = React.useMemo(
    () => ({
      mini,
      fullyExpanded: isFullyExpanded,
      fullyCollapsed: isFullyCollapsed,
      hasDrawerTransitions,
      setExpanded,
    }),
    [mini, isFullyExpanded, isFullyCollapsed, hasDrawerTransitions, setExpanded]
  );

  return (
    <DashboardSidebarContext.Provider value={sidebarContextValue}>
      {/* MOBILE */}
      <Drawer
        container={container}
        variant="temporary"
        open={expanded}
        onClose={handleSetSidebarExpanded(false)}
        sx={{
          display: { xs: 'block', sm: disableCollapsibleSidebar ? 'block' : 'none', md: 'none' },
          ...getDrawerSharedSx(true),
        }}
      >
        {getDrawerContent('phone')}
      </Drawer>

      {/* TABLETTE */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: disableCollapsibleSidebar ? 'none' : 'block', md: 'none' },
          ...getDrawerSharedSx(false),
        }}
      >
        {getDrawerContent('tablet')}
      </Drawer>

      {/* DESKTOP */}
      <Drawer
        variant="persistent"
        open={expanded}
        sx={{
          display: { xs: 'none', md: 'block' },
          ...getDrawerSharedSx(false),
        }}
      >
        {getDrawerContent('desktop')}
      </Drawer>
    </DashboardSidebarContext.Provider>
  );
}

DashboardSidebar.propTypes = {
  container: (props, propName) => {
    if (props[propName] == null) return null;
    if (
      typeof props[propName] !== 'object' ||
      props[propName].nodeType !== 1
    ) {
      return new Error(`Expected prop '${propName}' to be of type Element`);
    }
    return null;
  },
  disableCollapsibleSidebar: PropTypes.bool,
  expanded: PropTypes.bool,
  setExpanded: PropTypes.func.isRequired,
};

export default DashboardSidebar;
