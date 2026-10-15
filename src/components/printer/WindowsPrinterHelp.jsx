import { Alert, AlertTitle, Box, Button, Typography } from "@mui/material";
import DesktopWindowsIcon from "@mui/icons-material/DesktopWindows";
import DownloadIcon from "@mui/icons-material/Download";
import { useT } from "../../context/PrefsContext";
import { downloadKioskShortcut, savePrinterSettings } from "../../utils/directPrint";

/**
 * Why a printer already installed on a Windows PC does not appear in the USB list, and the one-click fix:
 * print through Windows itself (silent, no print window) using the shortcut file.
 */
export default function WindowsPrinterHelp({ onUseWindows, compact = false }) {
  const t = useT();
  const useWindows = () => {
    savePrinterSettings({ mode: "kiosk", device: null, noPrompt: true });
    onUseWindows?.();
  };
  return (
    <Alert severity="warning" icon={<DesktopWindowsIcon />} sx={{ mt: 2 }}>
      <AlertTitle sx={{ fontWeight: 700 }}>{t("Printer already installed on this Windows PC?")}</AlertTitle>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {t(
          "Windows keeps printers that have their own driver for itself, so they do not appear in the browser's USB list. Use the Windows printer instead — bills still print straight away, without the print window."
        )}
      </Typography>
      {!compact && (
        <ol style={{ margin: "0 0 8px", paddingLeft: 18 }}>
          <li>{t("Windows Settings → Printers: make the bill printer the default printer (turn off \"Let Windows manage my default printer\").")}</li>
          <li>{t("Download the shortcut below, put it on the desktop and open the app from it every day.")}</li>
          <li>{t("Sign in once in that window. Press Test print — the slip prints without any window.")}</li>
        </ol>
      )}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button size="small" variant="contained" color="warning" startIcon={<DesktopWindowsIcon />} onClick={useWindows}>
          {t("Use Windows printer")}
        </Button>
        <Button size="small" variant="outlined" color="inherit" startIcon={<DownloadIcon />} onClick={downloadKioskShortcut}>
          {t("Download shortcut")}
        </Button>
      </Box>
    </Alert>
  );
}
