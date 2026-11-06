import { createTheme } from '@mui/material/styles';

const colors = {
  canvas: '#EEF4EE',
  surface: '#FFFFFF',
  ink: '#162B23',
  muted: '#4C655A',
  line: '#CEDFD2',
  accent: '#174C3A',
  soft: '#DEEFE2',
  error: '#A3293B',
  warning: '#825013',
};

export const campusTheme = createTheme({
  cssVariables: true,
  palette: {
    primary: { main: colors.accent, contrastText: colors.surface },
    secondary: { main: colors.muted },
    background: { default: colors.canvas, paper: colors.surface },
    text: { primary: colors.ink, secondary: colors.muted },
    divider: colors.line,
    error: { main: colors.error },
    warning: { main: colors.warning },
    success: { main: colors.accent },
    action: { selected: colors.soft },
  },
  typography: {
    fontFamily: '"Manrope Variable", system-ui, sans-serif',
    h1: { fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, lineHeight: 1.15 },
    h2: { fontSize: '1.25rem', fontWeight: 750 },
    button: { textTransform: 'none', fontWeight: 750 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 999, minHeight: 40, paddingInline: 16 } },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { borderRadius: 20 } },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 20 } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          '&.Mui-selected': { backgroundColor: colors.soft, color: colors.accent },
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', fullWidth: true },
    },
  },
});
