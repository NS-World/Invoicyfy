import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Slider,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import UsbIcon from "@mui/icons-material/Usb";
import BluetoothIcon from "@mui/icons-material/Bluetooth";
import CableIcon from "@mui/icons-material/Cable";
import PrintIcon from "@mui/icons-material/Print";
import DesktopWindowsIcon from "@mui/icons-material/DesktopWindows";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { connectedName, directPrint, forgetPrinter, loadPrinterSettings, pairPrinter, savePrinterSettings, support } from "../../utils/directPrint";

const MODES = [
  { key: "dialog", icon: <PrintIcon />, title: "Normal (print window)", hint: "The browser print window opens; choose the printer there. Works everywhere." },
  { key: "kiosk", icon: <DesktopWindowsIcon />, title: "Windows PC: silent print (Chrome kiosk)", hint: "Prints to the default printer without any window. One-time shortcut setup below." },
  { key: "usb", icon: <UsbIcon />, title: "USB printer (direct)", hint: "Chrome / Edge. Best on Android tablets with an OTG cable; on Windows the printer may need the WinUSB driver." },
  { key: "bluetooth", icon: <BluetoothIcon />, title: "Bluetooth printer (direct)", hint: "Portable 58 / 80 mm printers, Chrome on Android or PC." },
  { key: "serial", icon: <CableIcon />, title: "Serial / COM port (direct)", hint: "Printers that show as a COM port (USB-serial, or Bluetooth paired in Windows)." },
];

/** Printer setup for this device: normal dialog, silent kiosk printing, or direct USB / Bluetooth / Serial. */
export default function PrinterSetup() {
  const t = useT();
  const notify = useNotify();
  const [s, setS] = useState(loadPrinterSettings);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(connectedName() || s.device?.name || null);
  const sup = support();
  const update = (patch) => {
    savePrinterSettings(patch);
    setS(loadPrinterSettings());
  };
  const direct = ["usb", "bluetooth", "serial"].includes(s.mode);
  const available = (k) => (k === "usb" ? sup.usb : k === "bluetooth" ? sup.bluetooth : k === "serial" ? sup.serial : true);

  const connect = async () => {
    setBusy(true);
    try {
      const n = await pairPrinter(s.mode);
      setName(n);
      notify(t("Printer connected: {name}", { name: n }));
    } catch (e) {
      if (e?.name !== "NotFoundError") notify(e.message || t("Could not connect"), "error");
    }
    setBusy(false);
  };
  const test = async () => {
    setBusy(true);
    try {
      await directPrint.testPrint();
      notify(t("Test slip sent to the printer"));
    } catch (e) {
      notify(e.message || t("Could not print"), "error");
    }
    setBusy(false);
  };

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {t("How should bills print on this device?")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("Saved only on this computer / phone, so each counter can use its own printer.")}
          </Typography>
          {!sup.secure && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t("Direct printing needs the app to open on https.")}
            </Alert>
          )}
          <RadioGroup value={s.mode} onChange={(e) => update({ mode: e.target.value })}>
            {MODES.map((m) => (
              <Paper
                key={m.key}
                variant="outlined"
                sx={{ p: 1.5, mb: 1, borderColor: s.mode === m.key ? "primary.main" : "divider", opacity: available(m.key) ? 1 : 0.55 }}
              >
                <FormControlLabel
                  value={m.key}
                  disabled={!available(m.key)}
                  control={<Radio />}
                  sx={{ alignItems: "flex-start", m: 0, width: "100%" }}
                  label={
                    <Box sx={{ display: "flex", gap: 1.5, pt: 0.75 }}>
                      <Box sx={{ color: "primary.main" }}>{m.icon}</Box>
                      <Box>
                        <Typography sx={{ fontWeight: 600 }}>
                          {t(m.title)} {!available(m.key) && <Chip size="small" label={t("not supported in this browser")} sx={{ ml: 0.5 }} />}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t(m.hint)}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              </Paper>
            ))}
          </RadioGroup>

          {direct && (
            <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
              <Button variant="contained" onClick={connect} disabled={busy || !available(s.mode)}>
                {name ? t("Change printer") : t("Connect printer")}
              </Button>
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={test} disabled={busy || !name}>
                {t("Test print")}
              </Button>
              {name && (
                <>
                  <Chip color="success" label={name} />
                  <Button
                    color="error"
                    startIcon={<LinkOffIcon />}
                    onClick={async () => {
                      await forgetPrinter();
                      setName(null);
                      setS(loadPrinterSettings());
                    }}
                  >
                    {t("Forget")}
                  </Button>
                </>
              )}
            </Box>
          )}

          {s.mode === "kiosk" && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                {t("One-time setup on the billing PC")}
              </Typography>
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                <li>{t("Set the thermal printer as the Windows default printer (Settings → Printers).")}</li>
                <li>{t("Right-click the desktop → New → Shortcut, and paste:")}</li>
              </ol>
              <Box component="code" sx={{ display: "block", p: 1, my: 1, bgcolor: "background.paper", borderRadius: 1, fontSize: 12, wordBreak: "break-all" }}>
                "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing {window.location.origin}
              </Box>
              {t("Open the app from this shortcut. Bills and KOT then print straight away without the print window.")}
            </Alert>
          )}
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            {t("Paper & options")}
          </Typography>
          <TextField select fullWidth size="small" label={t("Paper width")} value={s.paper} onChange={(e) => update({ paper: e.target.value })} sx={{ mb: 2 }}>
            <MenuItem value="80mm">80 mm (3 inch)</MenuItem>
            <MenuItem value="58mm">58 mm (2 inch)</MenuItem>
          </TextField>
          <FormControlLabel control={<Switch checked={Boolean(s.cut)} onChange={(e) => update({ cut: e.target.checked })} />} label={t("Auto cut after each slip")} />
          <FormControlLabel control={<Switch checked={Boolean(s.drawer)} onChange={(e) => update({ drawer: e.target.checked })} />} label={t("Open cash drawer when printing")} />
          {s.mode === "serial" && (
            <TextField select fullWidth size="small" label={t("Speed (baud)")} value={s.baud} onChange={(e) => update({ baud: e.target.value })} sx={{ mt: 2 }}>
              {[9600, 19200, 38400, 57600, 115200].map((b) => (
                <MenuItem key={b} value={b}>
                  {b}
                </MenuItem>
              ))}
            </TextField>
          )}
          {direct && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" gutterBottom>
                {t("Darkness")}
              </Typography>
              <Slider value={s.threshold} min={120} max={220} step={5} onChange={(_, v) => setS((x) => ({ ...x, threshold: v }))} onChangeCommitted={(_, v) => update({ threshold: v })} />
              <Typography variant="caption" color="text.secondary">
                {t("Move right if text prints too light, left if it is too dark.")}
              </Typography>
            </>
          )}
          <Alert severity="success" sx={{ mt: 2 }}>
            {t("If the direct printer is not reachable, the normal print window opens automatically — billing never stops.")}
          </Alert>
        </Paper>
      </Grid>
    </Grid>
  );
}
