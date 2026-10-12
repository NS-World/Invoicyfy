import { useState } from "react";
import { Box, Button, IconButton, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";
import TranslateIcon from "@mui/icons-material/Translate";
import DarkModeIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeIcon from "@mui/icons-material/LightModeOutlined";
import CheckIcon from "@mui/icons-material/Check";
import { usePrefs, useT } from "../../context/PrefsContext";
import { LANGUAGES } from "../../i18n";

/** Language (EN / ગુ / हि) and light-dark switch. `compact` shows icons only (collapsed sidebar). */
export default function PrefsSwitcher({ compact = false, short = false, color = "inherit" }) {
  const { lang, setLang, mode, setMode } = usePrefs();
  const t = useT();
  const [anchor, setAnchor] = useState(null);
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
  const dark = mode === "dark";

  return (
    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexDirection: compact ? "column" : "row" }}>
      {compact ? (
        <Tooltip title={t("Language")} placement="right">
          <IconButton onClick={(e) => setAnchor(e.currentTarget)} sx={{ color }} aria-label={t("Language")}>
            <TranslateIcon />
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          size="small"
          onClick={(e) => setAnchor(e.currentTarget)}
          startIcon={<TranslateIcon />}
          sx={{ color, flex: short ? "0 0 auto" : 1, minWidth: 0, justifyContent: "flex-start", border: "1px solid rgba(255,255,255,0.25)" }}
          aria-label={t("Language")}
        >
          {short ? current.short : current.label}
        </Button>
      )}
      <Tooltip title={dark ? t("Light mode") : t("Dark mode")} placement={compact ? "right" : "top"}>
        <IconButton onClick={() => setMode(dark ? "light" : "dark")} sx={{ color }} aria-label={dark ? t("Light mode") : t("Dark mode")}>
          {dark ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {LANGUAGES.map((l) => (
          <MenuItem
            key={l.code}
            selected={l.code === lang}
            onClick={() => {
              setLang(l.code);
              setAnchor(null);
            }}
          >
            <ListItemText primary={l.label} />
            {l.code === lang && <CheckIcon fontSize="small" sx={{ ml: 2 }} />}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
