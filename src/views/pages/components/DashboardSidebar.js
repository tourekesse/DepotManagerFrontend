import * as React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Toolbar from '@mui/material/Toolbar';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';

import { matchPath, useLocation } from 'react-router-dom';

import DashboardSidebarContext from '../context/DashboardSidebarContext';
import { DRAWER_WIDTH, MINI_DRAWER_WIDTH } from '../constants';

import DashboardSidebarPageItem from './DashboardSidebarPageItem';
import DashboardSidebarHeaderItem from './DashboardSidebarHeaderItem';

import {
getDrawerSxTransitionMixin,
        getDrawerWidthTransitionMixin,
        } from '../mixins';

function DashboardSidebar( {
expanded = true,
        setExpanded,
        disableCollapsibleSidebar = false,
        container,
        }) {
    const theme = useTheme();
    const {pathname} = useLocation();

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

    const getDrawerContent = React.useCallback(
            (viewport) => (
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
                    {/* TABLEAU DE BORD */}
                    <DashboardSidebarPageItem
                        id="dashboard"
                        title="Tableau de bord"
                        icon={ < DashboardIcon / > }
                        href="/accueil"
                        selected={pathname === '/accueil'}
                        />
                
                    {/* PRODUITS */}
                    <DashboardSidebarPageItem
                        id="produits"
                        title="Produits"
                        icon={ < InventoryIcon / > }
                        href="/accueil/produits"
                        selected={!!matchPath('/accueil/produits/*', pathname)}
                        />
                    {/* --- AJOUT DE L'ONGLET VENTES ICI --- */}
                    <DashboardSidebarPageItem
                        id="ventes"
                        title="Ventes"
                        icon={ < ShoppingCartIcon / > }
                        href="/accueil/ventes"
                        selected={!!matchPath('/accueil/ventes/*', pathname)}
                        />         
                
                    {/* LIVREURS */}
                    <DashboardSidebarPageItem
                        id="livreurs"
                        title="Livreurs"
                        icon={<LocalShippingIcon />}
                        href="/accueil/livreurs"
                        selected={!!matchPath('/accueil/livreurs*', pathname)}
                    />
                
                    </List>
                </Box>
                </>
                                        ),
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
                                    ...(isTemporary ? {position: 'absolute'} : {}),
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
                                                    display: {xs: 'block', sm: disableCollapsibleSidebar ? 'block' : 'none', md: 'none'},
                                                    ...getDrawerSharedSx(true),
                                                }}
                                            >
                                            {getDrawerContent('phone')}
                                        </Drawer>
                                    
                                        {/* TABLETTE */}
                                        <Drawer
                                            variant="permanent"
                                            sx={{
                                                    display: {xs: 'none', sm: disableCollapsibleSidebar ? 'none' : 'block', md: 'none'},
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
                                                    display: {xs: 'none', md: 'block'},
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
                                if (props[propName] == null)
                                    return null;
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
