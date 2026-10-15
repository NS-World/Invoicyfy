import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Typography } from "@mui/material";
import UsbIcon from "@mui/icons-material/Usb";
import BluetoothIcon from "@mui/icons-material/Bluetooth";
import CableIcon from "@mui/icons-material/Cable";
import PrintIcon from "@mui/icons-material/Print";
import { useNavigate } from "react-router-dom";
import { useT } from "../../context/PrefsContext";
import WindowsPrinterHelp from "./WindowsPrinterHelp";
import { PRINTER_ASK_EVENT, isWindows, isWindowsDriverProblem, loadPrinterSettings, pairPrinter, savePrinterSettings, support } from "../../utils/directPrint";

const KINDS = [
  ["usb", "USB printer", <UsbIcon key="u" />],
  ["bluetooth", "Bluetooth printer", <BluetoothIcon key="b" />],
  ["serial", "Serial / COM port", <CableIcon key="s" />],
];

/**
 * Shown when a print button is pressed and the thermal printer is not connected yet (or not reachable after
 * a refresh): one click connects it, and from then on bills and KOT print straight away without the print window.
 */
export default function PrinterPrompt() {
  const t = useT();
  const navigate = useNavigate();
  const [ask, setAsk] = useState(null); // { reason, resolve }
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [noAsk, setNoAsk] = useState(false);
  const [winHelp, setWinHelp] = useState(false);
  const askRef = useRef(null);
  askRef.current = ask;

  useEffect(() => {
    window.__printerPromptMounted = true;
    const onAsk = (e) => {
      // Only one prompt at a time; a second print while it is open uses the print window.
      if (askRef.current) return e.detail.resolve("dialog");
      setError("");
      setNoAsk(false);
      setWinHelp(false);
      setAsk(e.detail);
    };
    window.addEventListener(PRINTER_ASK_EVENT, onAsk);
    return () => {
      window.__printerPromptMounted = false;
      window.removeEventListener(PRINTER_ASK_EVENT, onAsk);
    };
  }, []);

  const finish = (answer) => {
    if (answer === "dialog" && noAsk) savePrinterSettings({ noPrompt: true });
    ask?.resolve(answer);
    setAsk(null);
    setBusy("");
  };

  const connect = async (kind) => {
    setBusy(kind);
    setError("");
    try {
      await pairPrinter(kind); // runs from this click, as the browser requires
      finish("paired");
    } catch (e) {
      setBusy("");
      if (kind === "usb" && isWindowsDriverProblem(e)) setWinHelp(true);
      else if (e?.name !== "NotFoundError") setError(e?.message || t("Could not connect"));
    }
  };

  if (!ask) return null;
  const sup = support();
  const saved = loadPrinterSettings();
  const kinds = ask.reason === "reconnect" ? KINDS.filter(([k]) => k === saved.mode) : KINDS.filter(([k]) => sup[k]);

  return (
    <Dialog open onClose={() => finish("dialog")} fullWidth maxWidth="xs" className="no-print">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <PrintIcon color="primary" />
        {ask.reason === "reconnect" ? t("Printer not connected") : t("Print without the print window?")}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {ask.reason === "reconnect"
            ? t("The printer {name} is not connected (switched off, unplugged or the page was refreshed). Connect it again and this bill prints right away.", {
                name: saved.device?.name || "",
              })
            : t("Connect your thermal printer once. After that every bill and KOT prints straight away when you press Print — no print window.")}
        </Typography>
        <Box sx={{ display: "grid", gap: 1 }}>
          {kinds.map(([k, label, icon]) => (
            <Button key={k} variant="contained" size="large" startIcon={icon} onClick={() => connect(k)} disabled={Boolean(busy)} sx={{ justifyContent: "flex-start" }}>
              {busy === k ? t("Connecting...") : ask.reason === "reconnect" ? t("Connect again") : t(label)}
            </Button>
          ))}
        </Box>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {(winHelp || (isWindows() && ask.reason === "setup")) && (
          <WindowsPrinterHelp compact={!winHelp} onUseWindows={() => finish("dialog")} />
        )}
        {ask.reason === "setup" && (
          <FormControlLabel sx={{ mt: 1 }} control={<Checkbox checked={noAsk} onChange={(e) => setNoAsk(e.target.checked)} />} label={t("Don't ask again on this device")} />
        )}
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button
          color="inherit"
          onClick={() => {
            finish("dialog");
            navigate("/counter");
          }}
        >
          {t("More printer options")}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={() => finish("dialog")}>{t("Use print window")}</Button>
      </DialogActions>
    </Dialog>
  );
}
