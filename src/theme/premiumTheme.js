import { createTheme } from '@mui/material/styles';

const premiumTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#10b981',      // Vert émeraude
      light: '#34d399',
      dark: '#059669',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#3b82f6',      // Bleu pour contraste
      light: '#60a5fa',
      dark: '#2563eb',
      contrastText: '#ffffff',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    info: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
    },
    background: {
      default: '#f9fafb',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b',
    },
    divider: '#e5e7eb',
  },
  
  typography: {
    fontFamily: '"Poppins", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Outfit", "Poppins", sans-serif',
      fontWeight: 800,
      fontSize: '2.25rem',
      letterSpacing: '-0.02em',
      color: '#047857',
    },
    h2: {
      fontFamily: '"Outfit", "Poppins", sans-serif',
      fontWeight: 700,
      fontSize: '1.875rem',
      letterSpacing: '-0.01em',
      color: '#059669',
    },
    h3: {
      fontWeight: 700,
      fontSize: '1.5rem',
      color: '#047857',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.125rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    button: {
      fontWeight: 700,
      textTransform: 'none',
      fontSize: '1rem',
    },
    body1: {
      fontSize: '1rem',
    },
    body2: {
      fontSize: '0.875rem',
    },
  },
  
  shape: {
    borderRadius: 12,
  },
  
  shadows: [
    'none',
    '0 2px 8px rgba(0, 0, 0, 0.04)',
    '0 4px 12px rgba(0, 0, 0, 0.06)',
    '0 6px 16px rgba(0, 0, 0, 0.08)',
    '0 8px 24px rgba(0, 0, 0, 0.1)',
    '0 12px 32px rgba(0, 0, 0, 0.12)',
    '0 16px 40px rgba(0, 0, 0, 0.14)',
    '0 20px 48px rgba(0, 0, 0, 0.16)',
    '0 24px 56px rgba(0, 0, 0, 0.18)',
    '0 28px 64px rgba(0, 0, 0, 0.2)',
    '0 32px 72px rgba(0, 0, 0, 0.22)',
    '0 36px 80px rgba(0, 0, 0, 0.24)',
    '0 40px 88px rgba(0, 0, 0, 0.26)',
    '0 44px 96px rgba(0, 0, 0, 0.28)',
    '0 48px 104px rgba(0, 0, 0, 0.3)',
    '0 52px 112px rgba(0, 0, 0, 0.32)',
    '0 56px 120px rgba(0, 0, 0, 0.34)',
    '0 60px 128px rgba(0, 0, 0, 0.36)',
    '0 64px 136px rgba(0, 0, 0, 0.38)',
    '0 68px 144px rgba(0, 0, 0, 0.4)',
    '0 72px 152px rgba(0, 0, 0, 0.42)',
    '0 76px 160px rgba(0, 0, 0, 0.44)',
    '0 80px 168px rgba(0, 0, 0, 0.46)',
    '0 84px 176px rgba(0, 0, 0, 0.48)',
    '0 88px 184px rgba(0, 0, 0, 0.5)',
  ],
  
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: '#10b981 #f3f4f6',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: '10px',
            height: '10px',
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 10,
            background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
          },
          '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
            background: 'linear-gradient(180deg, #059669 0%, #047857 100%)',
          },
          '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
            background: '#f3f4f6',
          },
        },
      },
    },
    
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          padding: '10px 24px',
          fontWeight: 700,
          fontSize: '1rem',
          boxShadow: 'none',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
            transform: 'translateY(-2px)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
          color: '#ffffff',
          '&:hover': {
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
          color: '#ffffff',
          '&:hover': {
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          },
        },
        outlined: {
          borderColor: '#10b981',
          borderWidth: 2,
          color: '#059669',
          '&:hover': {
            borderWidth: 2,
            borderColor: '#059669',
            background: 'rgba(16, 185, 129, 0.04)',
          },
        },
        text: {
          color: '#059669',
          '&:hover': {
            background: 'rgba(16, 185, 129, 0.08)',
          },
        },
      },
    },
    
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: '2px solid #e5e7eb',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: '#10b981',
            transform: 'translateY(-2px)',
            boxShadow: '0 12px 32px rgba(16, 185, 129, 0.15)',
          },
        },
      },
    },
    
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
        elevation1: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        },
        elevation2: {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
        },
        elevation3: {
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    
    MuiTableHead: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          '& .MuiTableCell-head': {
            color: '#047857',
            fontWeight: 700,
            textTransform: 'uppercase',
            fontSize: '0.8125rem',
            letterSpacing: '0.1em',
            borderBottom: '2px solid #10b981',
            padding: '20px 24px',
          },
        },
      },
    },
    
    MuiTableRow: {
      styleOverrides: {
        root: {
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            background: 'linear-gradient(90deg, #f0fdf4 0%, transparent 100%)',
            borderLeft: '5px solid #10b981',
            '& .MuiTableCell-root': {
              paddingLeft: 'calc(24px - 5px)',
            },
          },
        },
      },
    },
    
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #f3f4f6',
          padding: '20px 24px',
          fontSize: '0.9375rem',
        },
      },
    },
    
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          borderRight: '2px solid #e5e7eb',
          boxShadow: '4px 0 16px rgba(0, 0, 0, 0.03)',
        },
      },
    },
    
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          margin: '4px 0',
          padding: '16px 24px',
          borderLeft: '4px solid transparent',
          transition: 'all 0.3s ease',
          color: '#64748b',
          fontWeight: 500,
          '&:hover': {
            background: 'linear-gradient(90deg, #ecfdf5 0%, transparent 100%)',
            borderLeftColor: '#10b981',
            color: '#059669',
          },
          '&.Mui-selected': {
            background: 'linear-gradient(90deg, #d1fae5 0%, #ecfdf5 50%, transparent 100%)',
            borderLeftColor: '#10b981',
            color: '#047857',
            fontWeight: 600,
            '&:hover': {
              background: 'linear-gradient(90deg, #d1fae5 0%, #ecfdf5 50%, transparent 100%)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              right: '24px',
              width: '8px',
              height: '8px',
              background: '#10b981',
              borderRadius: '50%',
              boxShadow: '0 0 12px rgba(16, 185, 129, 0.6)',
            },
          },
        },
      },
    },
    
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: 40,
          color: 'inherit',
        },
      },
    },
    
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontWeight: 'inherit',
        },
      },
    },
    
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 25,
          fontWeight: 600,
          fontSize: '0.875rem',
        },
        filled: {
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          color: '#047857',
          border: '2px solid #10b981',
        },
        outlined: {
          borderColor: '#10b981',
          borderWidth: 2,
          color: '#059669',
        },
      },
    },
    
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#0f172a',
          borderBottom: '2px solid #10b981',
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.08)',
        },
      },
    },
    
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#10b981',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#10b981',
              borderWidth: 2,
            },
          },
        },
      },
    },
    
    MuiSelect: {
      styleOverrides: {
        root: {
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#10b981',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#10b981',
            borderWidth: 2,
          },
        },
      },
    },
    
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: '#10b981',
            '& + .MuiSwitch-track': {
              backgroundColor: '#10b981',
            },
          },
        },
      },
    },
    
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: '#10b981',
          '&.Mui-checked': {
            color: '#10b981',
          },
        },
      },
    },
    
    MuiRadio: {
      styleOverrides: {
        root: {
          color: '#10b981',
          '&.Mui-checked': {
            color: '#10b981',
          },
        },
      },
    },
    
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: '#d1fae5',
        },
        bar: {
          backgroundColor: '#10b981',
        },
      },
    },
    
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: '#10b981',
        },
      },
    },
  },
});

export default premiumTheme;
