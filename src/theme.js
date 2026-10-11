import { createTheme, responsiveFontSizes } from "@mui/material/styles";

// Brand colours from the original design: teal primary, dark sidebar.
let theme = createTheme({
  palette: {
    primary: { main: "#045864", contrastText: "#fff" },
    secondary: { main: "#9c27b0" },
    background: { default: "#f4f6f8", paper: "#ffffff" },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 12 } } },
    MuiTextField: { defaultProps: { size: "small" } },
    MuiFormControl: { defaultProps: { size: "small" } },
    MuiSelect: { defaultProps: { size: "small" } },
    MuiAutocomplete: { defaultProps: { size: "small" } },
    MuiDialog: { styleOverrides: { paper: { margin: 16, width: "calc(100% - 32px)" } } },
  },
});
theme = responsiveFontSizes(theme);

export const SIDEBAR_BG = "#1a1d21";
export default theme;
