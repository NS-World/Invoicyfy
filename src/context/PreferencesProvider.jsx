import { useEffect, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { makeTheme } from "../theme";
import { LANGUAGES } from "../i18n";
import { PrefsContext } from "./PrefsContext";

const read = (key, allowed, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
};
const save = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: keep it for this visit only */
  }
};

/** Language (English / ગુજરાતી / हिन्दी) and light / dark theme, remembered on this device. */
export function PreferencesProvider({ children }) {
  const systemDark = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const [mode, setModeState] = useState(() => read("theme_mode", ["light", "dark"], systemDark ? "dark" : "light"));
  const [lang, setLangState] = useState(() => read("lang", LANGUAGES.map((l) => l.code), "en"));
  const theme = useMemo(() => makeTheme(mode), [mode]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dataset.theme = mode;
  }, [lang, mode]);

  const value = useMemo(
    () => ({
      lang,
      mode,
      setLang: (l) => {
        setLangState(l);
        save("lang", l);
      },
      setMode: (m) => {
        setModeState(m);
        save("theme_mode", m);
      },
    }),
    [lang, mode]
  );

  return (
    <PrefsContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </PrefsContext.Provider>
  );
}
