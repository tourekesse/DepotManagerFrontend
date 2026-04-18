import CssBaseline from '@mui/material/CssBaseline';
import DashboardLayout from './components/DashboardLayout';
import NotificationsProvider from './hooks/useNotifications/NotificationsProvider';
import DialogsProvider from './hooks/useDialogs/DialogsProvider';
import AppTheme from '../shared-theme/AppTheme';

import {
  dataGridCustomizations,
  datePickersCustomizations,
  sidebarCustomizations,
  formInputCustomizations,
} from './theme/customizations';

// ✅ Fusion des customisations MUI
const themeComponents = {
  ...dataGridCustomizations,
  ...datePickersCustomizations,
  ...sidebarCustomizations,
  ...formInputCustomizations,
};

export default function CrudDashboard(props) {
  return (
    <AppTheme {...props} themeComponents={themeComponents}>
      <CssBaseline enableColorScheme />

      <NotificationsProvider>
        <DialogsProvider>

          {/* ✅ Plus de Router interne ici */}
          {/* ✅ DashboardLayout gère juste l'affichage */}
          <DashboardLayout />

        </DialogsProvider>
      </NotificationsProvider>
    </AppTheme>
  );
}
