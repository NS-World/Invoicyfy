import { useEffect, useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Tooltip, Typography } from "@mui/material";
import InstallMobileIcon from "@mui/icons-material/InstallMobile";
import IosShareIcon from "@mui/icons-material/IosShare";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
import { useT } from "../../context/PrefsContext";
import { canPromptInstall, isIos, isStandalone, onInstallChange, promptInstall } from "../../utils/installPrompt";

/**
 * "Install app" in the top bar: on Android (Chrome) it opens the install dialog, on iPhone / iPad it shows the
 * two Safari steps. Hidden when the app is already opened from the home screen.
 */
export default function InstallApp({ color = "inherit", label = false }) {
  const t = useT();
  const [, setTick] = useState(0);
  const [help, setHelp] = useState(false);
  useEffect(() => onInstallChange(() => setTick((n) => n + 1)), []);

  if (isStandalone() || (!canPromptInstall() && !isIos())) return null;

  const install = async () => {
    if (canPromptInstall()) await promptInstall();
    else setHelp(true);
  };

  return (
    <>
      {label ? (
        <Button size="small" variant="outlined" startIcon={<InstallMobileIcon />} onClick={install} sx={{ color, borderColor: "divider", whiteSpace: "nowrap" }}>
          {t("Install app")}
        </Button>
      ) : (
        <Tooltip title={t("Install app")}>
          <IconButton onClick={install} sx={{ color }} aria-label={t("Install app")}>
            <InstallMobileIcon />
          </IconButton>
        </Tooltip>
      )}
      <Dialog open={help} onClose={() => setHelp(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t("Install Khanak on iPhone / iPad")}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {t("Open this page in Safari, then:")}
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 1.5 }}>
            <IosShareIcon color="primary" />
            <Typography variant="body2">{t("1. Tap the Share button at the bottom of the screen")}</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 1.5 }}>
            <AddBoxOutlinedIcon color="primary" />
            <Typography variant="body2">{t("2. Choose \"Add to Home Screen\" and tap Add")}</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {t("Khanak then opens from its own icon, full screen, like any other app.")}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelp(false)}>{t("OK")}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
