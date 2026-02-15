import React from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import AnalyticsRoundedIcon from '@mui/icons-material/AnalyticsRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import HelpRoundedIcon from '@mui/icons-material/HelpRounded';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { getMenuForCurrentRole } from '../../config/roleConfig.js';
import { fetchMenu } from '../../api/menuApi';
import { useNavigate } from 'react-router-dom';

export default function MenuContent() {
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = React.useState(getMenuForCurrentRole());

  React.useEffect(() => {
    const roleMenu = getMenuForCurrentRole();
    setMenuItems(roleMenu);
    const role = localStorage.getItem('role') || (JSON.parse(localStorage.getItem('dmUser') || '{}').role);
    if (role) {
      fetchMenu(role).then((apiMenu) => {
        if (apiMenu && apiMenu.length) setMenuItems(apiMenu);
      }).catch(() => {});
    }
  }, []);

  const getIcon = (iconName) => {
    switch (iconName) {
      case 'Dashboard': return <HomeRoundedIcon />;
      case 'People': return <PeopleRoundedIcon />;
      case 'Inventory': return <InventoryIcon />;
      case 'LocalShipping': return <LocalShippingIcon />;
      case 'ShoppingCart': return <ShoppingCartIcon />;
      case 'History': return <HistoryIcon />;
      case 'Add': return <AddIcon />;
      case 'Inventory2': return <InventoryIcon />;
      case 'AccountBalanceWallet': return <AccountBalanceWalletIcon />;
      default: return <AssignmentRoundedIcon />;
    }
  };

  return (
    <Stack sx={{ flexGrow: 1, p: 1, justifyContent: 'space-between' }}>
      <List dense>
        {menuItems.map((item, index) => (
          <ListItem key={index} disablePadding sx={{ display: 'block' }}>
            <ListItemButton onClick={() => navigate(item.path)}>
              <ListItemIcon>{getIcon(item.icon)}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}
