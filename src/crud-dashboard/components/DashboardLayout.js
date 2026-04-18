import * as React from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import { Outlet, useLocation, Navigate } from 'react-router';
import { fetchMenu } from '../../api/menuApi';
import DashboardHeader from './DashboardHeader';
import DashboardSidebar from './DashboardSidebar';
import SitemarkIcon from './SitemarkIcon';

export default function DashboardLayout() {
  const theme = useTheme();
  const { pathname } = useLocation();

  const [isDesktopNavigationExpanded, setIsDesktopNavigationExpanded] =
    React.useState(true);
  const [isMobileNavigationExpanded, setIsMobileNavigationExpanded] =
    React.useState(false);
  const [menuItems, setMenuItems] = React.useState([]);

  const isOverMdViewport = useMediaQuery(theme.breakpoints.up('md'));

  const isNavigationExpanded = isOverMdViewport
    ? isDesktopNavigationExpanded
    : isMobileNavigationExpanded;

  const setIsNavigationExpanded = React.useCallback(
    (newExpanded) => {
      if (isOverMdViewport) {
        setIsDesktopNavigationExpanded(newExpanded);
      } else {
        setIsMobileNavigationExpanded(newExpanded);
      }
    },
    [
      isOverMdViewport,
      setIsDesktopNavigationExpanded,
      setIsMobileNavigationExpanded,
    ],
  );

  const handleToggleHeaderMenu = React.useCallback(
    (isExpanded) => {
      setIsNavigationExpanded(isExpanded);
    },
    [setIsNavigationExpanded],
  );

  const layoutRef = React.useRef(null);

  // Rôles et routes autorisées
  const dmUser = JSON.parse(localStorage.getItem('dmUser') || '{}');
  const role = dmUser.role || localStorage.getItem('role');
  const userId = dmUser.userId;

  React.useEffect(() => {
    fetchMenu(role, userId)
      .then((apiMenu) => {
        if (apiMenu && apiMenu.length) setMenuItems(apiMenu);
      })
      .catch(() => {});
  }, [role, userId]);

  // Autorisation basée sur les routes disponibles dans le menu reçu
  const allowedPaths = React.useMemo(
    () => menuItems.map((item) => item.path),
    [menuItems],
  );

  const isAllowed = allowedPaths.length === 0 // pas encore chargé → ne pas bloquer
    ? true
    : allowedPaths.some(
        (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
      );

  if (!isAllowed) {
    // Redirige vers le premier item du menu ou vers /accueil par défaut
    const target = allowedPaths[0] || '/accueil';
    return <Navigate to={target} replace />;
  }

  return (
    <Box
      ref={layoutRef}
      sx={{
        position: 'relative',
        display: 'flex',
        overflow: 'visible',   // ✅ CORRECTION ICI
        height: '100%',
        width: '100%',
      }}
    >
      <DashboardHeader
        logo={<SitemarkIcon />}
        title=""
        menuOpen={isNavigationExpanded}
        onToggleMenu={handleToggleHeaderMenu}
      />

      <DashboardSidebar
        expanded={isNavigationExpanded}
        setExpanded={setIsNavigationExpanded}
        container={layoutRef?.current ?? undefined}
      />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minWidth: 0,
        }}
      >
        <Toolbar sx={{ displayPrint: 'none' }} />
        <Box
          component="main"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
