import { useCallback, useEffect, useState } from "react";
import { Badge, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Tooltip, Typography } from "@mui/material";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import CloudSyncIcon from "@mui/icons-material/CloudSync";
import ErrorIcon from "@mui/icons-material/ErrorOutline";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { formatCurrency } from "../../utils/format";
import { OUTBOX_EVENT, listOutbox, removeFromOutbox, retryOutbox, syncOutbox } from "../../utils/offline";

/**
 * Internet status + bills waiting to be sent. Sends waiting bills automatically when the connection is back
 * (and every minute while some are waiting).
 */
export default function OfflineStatus({ color = "inherit" }) {
  const t = useT();
  const notify = useNotify();
  const [online, setOnline] = useState(() => navigator.onLine);
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => listOutbox().then(setRows), []);

  const sync = useCallback(
    async (silent) => {
      setBusy(true);
      try {
        const res = await syncOutbox();
        if (res.sent.length) {
          notify(t("{n} offline bill(s) sent: {list}", { n: res.sent.length, list: res.sent.map((s) => `${s.provisional} → ${s.invoice_number}`).join(", ") }));
        } else if (!silent && res.pending) {
          notify(t("Still offline — bills will be sent when the internet is back"), "warning");
        }
      } finally {
        setBusy(false);
        refresh();
      }
    },
    [notify, refresh, t]
  );

  useEffect(() => {
    refresh();
    const on = () => {
      setOnline(true);
      sync(true);
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener(OUTBOX_EVENT, refresh);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener(OUTBOX_EVENT, refresh);
    };
  }, [refresh, sync]);

  const pending = rows.filter((r) => r.status !== "error").length;
  const errors = rows.filter((r) => r.status === "error").length;
  useEffect(() => {
    if (!pending) return undefined;
    const timer = setInterval(() => navigator.onLine && sync(true), 60000);
    if (navigator.onLine) sync(true);
    return () => clearInterval(timer);
  }, [pending, sync]);

  const icon = !online ? <CloudOffIcon /> : rows.length ? <CloudSyncIcon /> : <CloudDoneIcon />;
  const label = !online ? t("Offline") : rows.length ? t("{n} to send", { n: rows.length }) : t("Online");

  return (
    <>
      <Tooltip title={!online ? t("No internet — bills are saved on this device") : rows.length ? t("Bills waiting to be sent") : t("Connected")}>
        <Box data-tour="offline-status" sx={{ display: "inline-flex" }}>
          {rows.length || !online ? (
            <Chip
              size="small"
              icon={icon}
              label={label}
              onClick={() => setOpen(true)}
              color={!online ? "warning" : errors ? "error" : "info"}
              sx={{ fontWeight: 700 }}
            />
          ) : (
            <IconButton size="small" sx={{ color }} onClick={() => setOpen(true)} aria-label={label}>
              <Badge variant="dot" color="success">
                {icon}
              </Badge>
            </IconButton>
          )}
        </Box>
      </Tooltip>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t("Offline bills")}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {online ? t("Internet is connected.") : t("No internet. Quick Bills are saved on this device and printed with an OFF- number.")}{" "}
            {t("Waiting bills are sent automatically and get their real bill number.")}
          </Typography>
          {rows.length === 0 && (
            <Typography sx={{ py: 2, textAlign: "center" }} color="text.secondary">
              {t("Nothing waiting. All bills are on the server.")}
            </Typography>
          )}
          {rows.map((r) => (
            <Box key={r.client_uuid} sx={{ display: "flex", gap: 1, alignItems: "center", py: 1, borderTop: 1, borderColor: "divider", flexWrap: "wrap" }}>
              <Box sx={{ flex: 1, minWidth: 180 }}>
                <Typography sx={{ fontWeight: 700 }}>
                  {r.preview?.invoice_number} · {formatCurrency(r.preview?.total_amount)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(r.created_at).toLocaleString()} · {r.preview?.items?.length} {t("items")}
                  {r.preview?.customer_name ? ` · ${r.preview.customer_name}` : ""}
                </Typography>
                {r.error && (
                  <Typography variant="caption" color="error" component="div" sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                    <ErrorIcon sx={{ fontSize: 14 }} /> {r.error}
                  </Typography>
                )}
              </Box>
              {r.status === "error" ? (
                <>
                  <Button size="small" onClick={() => retryOutbox(r.client_uuid)}>
                    {t("Retry")}
                  </Button>
                  <Button size="small" color="error" onClick={() => removeFromOutbox(r.client_uuid)}>
                    {t("Discard")}
                  </Button>
                </>
              ) : (
                <Chip size="small" label={t("Waiting")} />
              )}
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t("Close")}</Button>
          <Button variant="contained" startIcon={<CloudSyncIcon />} onClick={() => sync(false)} disabled={busy || !rows.length}>
            {busy ? t("Sending...") : t("Send now")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
