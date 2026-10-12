import { useEffect, useState } from "react";
import { Alert, Button, CircularProgress } from "@mui/material";
import { SystemServices } from "../../services/SystemServices";
import { useAuth } from "../../context/useAuth";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { apiError } from "../../utils/format";

/** After a new version is uploaded, tells the Admin that new tables are needed and creates them in one click (no SSH). */
export default function DatabaseUpdateBanner() {
  const t = useT();
  const notify = useNotify();
  const { isAdmin } = useAuth();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    SystemServices.status()
      .then((r) => setStatus(r.data))
      .catch(() => {});
  }, [isAdmin]);

  if (!status?.needs_update) return null;
  const run = async () => {
    setBusy(true);
    try {
      const res = await SystemServices.updateDatabase();
      notify(t("Database updated. New features are ready."));
      setStatus({ ...status, needs_update: false });
      if (res.data?.changes) setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      notify(apiError(e), "error");
    }
    setBusy(false);
  };
  return (
    <Alert
      severity="warning"
      sx={{ mb: 2 }}
      action={
        <Button color="inherit" size="small" variant="outlined" onClick={run} disabled={busy} startIcon={busy ? <CircularProgress size={14} /> : null}>
          {t("Update database")}
        </Button>
      }
    >
      {t("A new version was installed. Update the database once to turn on the new features ({n} change(s)). Your data stays safe.", { n: status.pending.length })}
    </Alert>
  );
}
