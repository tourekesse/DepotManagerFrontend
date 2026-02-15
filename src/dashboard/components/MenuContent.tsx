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
import InventoryIcon from '@mui/icons-material/Inventory';
import AddIcon from '@mui/icons-material/Add';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import HistoryIcon from '@mui/icons-material/History';
import { fetchMenu } from '../../api/menuApi';
import { getMenuForCurrentRole } from '../../config/roleConfig';
import { useNavigate } from 'react-router-dom';

type MenuItem = { label: string; path: string; icon?: string };

export default function MenuContent() {
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = React.useState<MenuItem[]>(getMenuForCurrentRole());

  React.useEffect(() => {
    const roleMenu = getMenuForCurrentRole();
    setMenuItems(roleMenu);
    const dmUserRole = (JSON.parse(localStorage.getItem('dmUser') || '{}').role);
    const role = dmUserRole || localStorage.getItem('role');
    if (role) {
      fetchMenu(role).then((apiMenu) => {
        if (apiMenu && apiMenu.length) setMenuItems(apiMenu);
      }).catch(() => {});
    }
  }, []);

  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Dashboard': return <HomeRoundedIcon />;
      case 'ShoppingCart': return <ShoppingCartIcon />;
      case 'Inventory': return <InventoryIcon />;
      case 'Inventory2': return <Inventory2Icon />;
      case 'Add': return <AddIcon />;
      case 'History': return <HistoryIcon />;
      default: return <AssignmentRoundedIcon />;
    }
  };

  return (
    <Stack sx={{ flexGrow: 1, p: 1, justifyContent: 'space-between' }}>
      <List dense>
        {menuItems.map((item, index) => (
          <ListItem key={item.path ?? index} disablePadding sx={{ display: 'block' }}>
            <ListItemButton onClick={() => navigate(item.path)} selected={index === 0}>
              <ListItemIcon>{getIcon(item.icon)}</ListItemIcon>
              <ListItemText primary={item.label || item.path} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}
