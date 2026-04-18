import { type SxProps, type Theme } from '@mui/material/styles';

export const getDrawerSxTransitionMixin = (
  isFullyExpanded: boolean,
  property: 'padding' | 'margin',
): SxProps<Theme> => ({
  transition: (theme: Theme) =>
    theme.transitions.create(property, {
      duration: isFullyExpanded ? theme.transitions.duration.enteringScreen : theme.transitions.duration.leavingScreen,
      easing: isFullyExpanded ? theme.transitions.easing.easeOut : theme.transitions.easing.sharp,
    }),
});

export const getDrawerWidthTransitionMixin = (expanded: boolean): SxProps<Theme> => ({
  transition: (theme: Theme) =>
    theme.transitions.create('width', {
      duration: expanded ? theme.transitions.duration.enteringScreen : theme.transitions.duration.leavingScreen,
      easing: expanded ? theme.transitions.easing.easeOut : theme.transitions.easing.sharp,
    }),
});
