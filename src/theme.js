import { createTheme, responsiveFontSizes } from "@mui/material/styles";

// Gujarati / Hindi need Indic fonts: Nirmala UI on Windows, Noto on Android and Linux, system fonts on iOS / macOS.
const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Nirmala UI', 'Noto Sans Gujarati', 'Noto Sans Devanagari', 'Shruti', 'Mangal', sans-serif";

/** Brand colours from the original design: teal primary, dark sidebar. Works in light and dark mode. */
export const makeTheme = (mode = "light") => {
  const dark = mode === "dark";
  const theme = createTheme({
    palette: {
      mode,
      primary: dark ? { main: "#4fb3bf", contrastText: "#0b1f22" } : { main: "#045864", contrastText: "#fff" },
      secondary: { main: dark ? "#ce93d8" : "#9c27b0" },
      background: dark ? { default: "#121417", paper: "#1c2025" } : { default: "#f4f6f8", paper: "#ffffff" },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: FONT,
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
  return responsiveFontSizes(theme);
};

/** Grey canvas behind invoice / receipt previews (the paper itself stays white). */
export const previewCanvas = (t) => (t.palette.mode === "dark" ? "#2a2f36" : "#eef1f4");

export const SIDEBAR_BG = "#1a1d21";
export default makeTheme("light");
