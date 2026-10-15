import { useEffect, useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useT } from "../../context/PrefsContext";
import { apiError, formatNumber } from "../../utils/format";

/**
 * Delete with everything linked to it. Shows, in red, every kind of record that goes with it (from the
 * server's preview) and asks to type DELETE when anything besides the record itself is removed.
 *   preview(): Promise<{name, related: [{key, label, count, effect: delete|unlink|off}]}>
 *   remove():  Promise<{message}>
 */
export default function DeleteRelatedDialog({ open, title, name, preview, remove, onClose, onDeleted }) {
  const t = useT();
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setPlan(null);
    setError("");
    setTyped("");
    preview()
      .then((r) => alive && setPlan(r.related || []))
      .catch((e) => alive && setError(apiError(e)));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const deleted = (plan || []).filter((r) => r.effect === "delete");
  const kept = (plan || []).filter((r) => r.effect !== "delete");
  const needsWord = deleted.length > 0;
  const ready = plan !== null && (!needsWord || typed.trim().toUpperCase() === "DELETE");

  const go = async () => {
    setBusy(true);
    try {
      const res = await remove();
      onDeleted?.(res);
    } catch (e) {
      setError(apiError(e));
    }
    setBusy(false);
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, color: "error.main" }}>
        <WarningAmberIcon /> {t(title)}
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 1.5 }}>
          <b>{name}</b> {t("will be deleted permanently.")}
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}
        {plan === null && !error && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {plan !== null && deleted.length === 0 && kept.length === 0 && (
          <Alert severity="info">{t("Nothing else is linked to it. Only this record will be deleted.")}</Alert>
        )}
        {deleted.length > 0 && (
          <Alert severity="error" variant="filled" sx={{ mb: 1.5 }}>
            <AlertTitle sx={{ fontWeight: 700 }}>{t("ALL these records will also be DELETED — this cannot be undone:")}</AlertTitle>
            <List dense disablePadding>
              {deleted.map((r) => (
                <ListItem key={r.key} disableGutters sx={{ py: 0 }}>
                  <ListItemText
                    primaryTypographyProps={{ fontWeight: 600, color: "inherit" }}
                    primary={`${formatNumber(r.count)} × ${t(r.label)}`}
                  />
                </ListItem>
              ))}
            </List>
          </Alert>
        )}
        {kept.length > 0 && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            <AlertTitle>{t("Also changed:")}</AlertTitle>
            <List dense disablePadding>
              {kept.map((r) => (
                <ListItem key={r.key} disableGutters sx={{ py: 0 }}>
                  <ListItemText primary={`${formatNumber(r.count)} × ${t(r.label)}`} />
                </ListItem>
              ))}
            </List>
          </Alert>
        )}
        {needsWord && (
          <TextField
            fullWidth
            autoFocus
            size="small"
            color="error"
            label={t("Type DELETE to confirm")}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ready && !busy && go()}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy} variant="outlined">
          {t("Cancel")}
        </Button>
        <Button onClick={go} disabled={!ready || busy} variant="contained" color="error">
          {busy ? t("Deleting...") : deleted.length ? t("Delete everything") : t("Delete")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
