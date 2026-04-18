import { createTheme } from '@mui/material/styles';

const depotTropicalTheme = createTheme({
  cssVariables: true,
  palette: {
    primary: {
      main: '#1ABC9C',
      light: '#26D0CE',
      dark: '#16A085',
      contrastText: '#fff',
    },
    secondary: {
      main: '#FF6B35',
      light: '#FF8A50',
      dark: '#E55100',
      contrastText: '#fff',
    },
    success: {
      main: '#27AE60',
      light: '#2ECC71',
      dark: '#229954',
    },
    warning: {
      main: '#FF6B35',
      light: '#FF8A50',
      dark: '#E55100',
    },
    error: {
      main: '#E74C3C',
      light: '#EC7063',
      dark: '#C0392B',
    },
    info: {
      main: '#3498DB',
      light: '#5DADE2',
      dark: '#2874A6',
    },
    background: {
      default: '#F8F9FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1A1A',
      secondary: '#555555',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Inter", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", system-ui, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: '#1A1A1A',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      color: '#1A1A1A',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      color: '#1A1A1A',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      color: '#1A1A1A',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      color: '#1A1A1A',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      color: '#1A1A1A',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          padding: '10px 24px',
          fontSize: '1rem',
          fontWeight: 600,
          textTransform: 'none',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
          },
        },
        contained: {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #1ABC9C 0%, #16A085 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #16A085 0%, #138D75 100%)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #FFC107 0%, #FFA000 100%)',
          color: '#000',
          '&:hover': {
            background: 'linear-gradient(135deg, #FFA000 0%, #FF8F00 100%)',
          },
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: `
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        body {
          font-family: "Poppins", "Inter", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", system-ui, sans-serif;
        }
      `,
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            transform: 'translateY(-4px)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '&:hover fieldset': {
              borderColor: '#1ABC9C',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#1ABC9C',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #1ABC9C 0%, #16A085 100%)',
          boxShadow: '0 4px 12px rgba(26, 188, 156, 0.2)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
        colorPrimary: {
          background: 'linear-gradient(135deg, #1ABC9C 0%, #16A085 100%)',
          color: '#fff',
        },
        colorSecondary: {
          background: 'linear-gradient(135deg, #FFC107 0%, #FFA000 100%)',
          color: '#000',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        },
        elevation2: {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
});

export default depotTropicalTheme;
