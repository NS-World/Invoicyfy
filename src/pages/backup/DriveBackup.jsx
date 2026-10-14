import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Chip, FormControlLabel, Grid, Link, Stack, Switch, TextField, Typography } from "@mui/material";
import AddToDriveIcon from "@mui/icons-material/AddToDrive";
import BackupIcon from "@mui/icons-material/Backup";
import DownloadIcon from "@mui/icons-material/Download";
import { useSearchParams } from "react-router-dom";
import { DriveServices } from "../../services/V4Services";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { apiError } from "../../utils/format";
import { downloadBlob } from "../../utils/download";

const when = (v) => (v ? new Date(String(v).replace(" ", "T")).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");

/** Nightly automatic backup (server copy + Google Drive). Admin only. */
export default function DriveBackup() {
  const t = useT();
  const notify = useNotify();
  const [params, setParams] = useSearchParams();
  const [s, setS] = useState(null);
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState("");

  const load = useCallback(() => {
    DriveServices.get()
      .then((r) => {
        setS(r.data);
        setF({ enabled: r.data.enabled, time: r.data.time, keep: r.data.keep, local_keep: r.data.local_keep, client_id: r.data.client_id, client_secret: "" });
      })
      .catch((e) => notify(apiError(e), "error"));
  }, [notify]);
  useEffect(load, [load]);

  // Back from Google: ?drive=connected or ?drive=error&message=...
  useEffect(() => {
    const d = params.get("drive");
    if (!d) return;
    if (d === "connected") notify(t("Google Drive connected"));
    else notify(params.get("message") || t("Google Drive was not connected"), "error");
    params.delete("drive");
    params.delete("message");
    setParams(params, { replace: true });
  }, [params, setParams, notify, t]);

  const run = async (key, fn) => {
    setBusy(key);
    try {
      const r = await fn();
      if (r?.message) notify(t(r.message), r.status === "error" ? "error" : "success");
      if (r?.data) {
        setS(r.data);
      } else {
        load();
      }
    } catch (e) {
      notify(apiError(e), "error");
      load();
    }
    setBusy("");
  };
  const save = () => run("save", () => DriveServices.save(f));
  const connect = async () => {
    setBusy("connect");
    try {
      const r = await DriveServices.connect(`${window.location.origin}${window.location.pathname}`);
      window.location.href = r.url;
    } catch (e) {
      notify(apiError(e), "error");
      setBusy("");
    }
  };
  const download = async (name) => {
    try {
      downloadBlob(await DriveServices.download(name), name);
    } catch (e) {
      notify(apiError(e), "error");
    }
  };

  if (!s || !f) return null;
  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1, flexWrap: "wrap" }}>
          <AddToDriveIcon color="success" />
          <Typography variant="h6" sx={{ flex: 1 }}>
            {t("Automatic backup every night")}
          </Typography>
          {s.connected ? <Chip color="success" label={`${t("Google Drive")}: ${s.email || t("connected")}`} /> : <Chip label={t("Google Drive not connected")} />}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("The whole database is saved as one file on the server every night and, when connected, uploaded to your Google Drive (folder \"Invoicyfy Backups\"). Restore it with \"Choose backup file\" above.")}
        </Typography>
        {s.last_run_at && (
          <Alert severity={s.last_ok ? "success" : "error"} sx={{ mb: 2 }}>
            {when(s.last_run_at)} — {s.last_result}
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControlLabel control={<Switch checked={Boolean(f.enabled)} onChange={(e) => setF({ ...f, enabled: e.target.checked })} />} label={t("Backup every night")} />
          </Grid>
          <Grid size={{ xs: 4, sm: 2.5 }}>
            <TextField fullWidth size="small" type="time" label={t("At")} value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 4, sm: 2.75 }}>
            <TextField fullWidth size="small" type="number" label={t("Keep on Drive")} value={f.keep} onChange={(e) => setF({ ...f, keep: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 4, sm: 2.75 }}>
            <TextField fullWidth size="small" type="number" label={t("Keep on server")} value={f.local_keep} onChange={(e) => setF({ ...f, local_keep: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label={t("Google Client ID")} value={f.client_id} onChange={(e) => setF({ ...f, client_id: e.target.value.trim() })} placeholder="1234-abc.apps.googleusercontent.com" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              size="small"
              type="password"
              label={t("Google Client secret")}
              value={f.client_secret}
              onChange={(e) => setF({ ...f, client_secret: e.target.value })}
              placeholder={s.client_secret_set ? t("Saved — type only to change") : ""}
            />
          </Grid>
        </Grid>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
          {t("One-time setup: in Google Cloud Console create an OAuth client (Web application), turn on the Google Drive API, and add this as Authorized redirect URI:")}{" "}
          <Box component="code" sx={{ wordBreak: "break-all", bgcolor: "action.hover", px: 0.5, borderRadius: 1 }}>
            {s.redirect_uri}
          </Box>{" "}
          <Link href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">
            console.cloud.google.com
          </Link>
          . {t("For the nightly run without the app open, add the cron job from DEPLOY-HOSTINGER.md.")}
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
          <Button variant="contained" onClick={save} disabled={Boolean(busy)}>
            {t("Save")}
          </Button>
          {s.connected ? (
            <Button color="error" onClick={() => run("disc", DriveServices.disconnect)} disabled={Boolean(busy)}>
              {t("Disconnect Google Drive")}
            </Button>
          ) : (
            <Button variant="outlined" color="success" startIcon={<AddToDriveIcon />} onClick={connect} disabled={Boolean(busy) || !s.client_id || !s.client_secret_set}>
              {t("Connect Google Drive")}
            </Button>
          )}
          <Button variant="outlined" startIcon={<BackupIcon />} onClick={() => run("now", DriveServices.runNow)} disabled={Boolean(busy)}>
            {busy === "now" ? t("Backing up...") : t("Backup now")}
          </Button>
        </Box>
        {s.local_files.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              {t("Backups on the server")}
            </Typography>
            {s.local_files.map((file) => (
              <Box key={file.name} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.25 }}>
                <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
                  {when(file.created_at)} · {(file.size / 1048576).toFixed(2)} MB
                </Typography>
                <Button size="small" startIcon={<DownloadIcon />} onClick={() => download(file.name)}>
                  {t("Download")}
                </Button>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
