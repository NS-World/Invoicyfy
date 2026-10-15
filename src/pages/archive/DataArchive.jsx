import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  LinearProgress,
  Link,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ArchiveIcon from "@mui/icons-material/Inventory2Outlined";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import DownloadIcon from "@mui/icons-material/Download";
import StopIcon from "@mui/icons-material/StopCircleOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { Link as RouterLink } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import { ArchiveServices } from "../../services/V4Services";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { apiError, formatCurrency, formatNumber } from "../../utils/format";
import { downloadBlob } from "../../utils/download";

const when = (v) => (v ? new Date(String(v).replace(" ", "T")).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");
const mb = (b) => `${(Number(b || 0) / 1048576).toFixed(2)} MB`;
const KEEP_YEARS = [0, 3, 4, 5, 6, 7, 8, 10];
const LOG_MONTHS = [0, 3, 6, 12, 24, 36];
const KIND = { daily: "Nightly backup", archive: "Year archive", purge: "Purge old year", logs: "Remove old logs" };
const STATUS_COLOR = { done: "success", failed: "error", cancelled: "default", running: "info", queued: "warning" };
const TABLE_LABEL = {
  invoices: "Bills",
  invoice_items: "Bill items",
  payments: "Payments",
  orders: "Orders",
  order_items: "Order items",
  expenses: "Expenses",
  stock_movements: "Stock history",
  cash_sessions: "Cash shifts",
  cash_movements: "Cash pay in / out",
  purchases: "Supplier bills",
  purchase_items: "Supplier bill items",
  supplier_payments: "Supplier payments",
  loyalty_ledger: "Loyalty entries",
  loyalty_entries: "Loyalty entries",
  cash_shifts: "Cash shifts",
  coupon_redemptions: "Coupon uses",
  stock_batches: "Empty stock batches",
  activity_log: "Activity log entries",
  messages: "Message log entries",
  campaigns: "Old campaigns",
  backup_logs: "Backup log entries",
  unpaid_bills: "Unpaid / part-paid bills (udhaar)",
  open_orders: "Pending orders",
  unpaid_purchases: "Unpaid supplier bills",
};

/**
 * Data & Archive (Admin): how long data stays in the app, one FINAL archive file per financial year on Google Drive,
 * purge of old years (oldest first, only after the archive is safe), old logs, and the log of every such job.
 * While a job runs this screen pushes it forward every 2 seconds; cron / the app also continue it in the background.
 */
export default function DataArchive() {
  const t = useT();
  const notify = useNotify();
  const [d, setD] = useState(null);
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState("");
  const [purge, setPurge] = useState(null); // { fy, label, preview, word }
  const [logsDlg, setLogsDlg] = useState(null);
  const timer = useRef(null);

  const apply = useCallback((data) => {
    setD(data);
    setF((old) => old || { ...data.settings });
  }, []);
  const load = useCallback(() => {
    ArchiveServices.overview()
      .then((r) => apply(r.data))
      .catch((e) => notify(apiError(e), "error"));
  }, [apply, notify]);
  useEffect(load, [load]);

  // While a job is waiting / running, move it forward from this screen too.
  const running = d?.open_jobs?.length > 0;
  useEffect(() => {
    if (!running) return undefined;
    let alive = true;
    const tick = async () => {
      try {
        const r = await ArchiveServices.step();
        if (!alive) return;
        apply(r.data);
        if (!r.data.open_jobs.length) {
          const last = r.data.jobs[0];
          if (last) notify(t(last.message || "Done"), last.status === "done" ? "success" : "error");
          return;
        }
      } catch {
        /* network blip: try again */
      }
      if (alive) timer.current = setTimeout(tick, 2000);
    };
    timer.current = setTimeout(tick, 1000);
    return () => {
      alive = false;
      clearTimeout(timer.current);
    };
  }, [running, apply, notify, t]);

  const act = async (key, fn, after) => {
    setBusy(key);
    try {
      const r = await fn();
      if (r?.message) notify(t(r.message));
      if (r?.data?.years) apply(r.data);
      after?.(r);
    } catch (e) {
      notify(apiError(e), "error");
    }
    setBusy("");
  };

  const openPurge = async (y) => {
    setPurge({ fy: y.fy, label: y.fy_label, preview: null, word: "" });
    try {
      const r = await ArchiveServices.preview(y.fy);
      setPurge((p) => (p && p.fy === y.fy ? { ...p, preview: r.data } : p));
    } catch (e) {
      notify(apiError(e), "error");
      setPurge(null);
    }
  };

  if (!d || !f) return <Loader />;
  const s = d.settings;
  const changed = JSON.stringify({ ...s, purged_before: null }) !== JSON.stringify({ ...f, purged_before: null });
  const openJobs = d.open_jobs || [];

  return (
    <Box>
      <PageHeader title={t("Data & Archive")} subtitle={t("Year-wise archive on Google Drive and removing old years so the app stays fast")} />

      {/* Drive status */}
      <Alert
        severity={d.drive.connected ? "success" : "warning"}
        icon={d.drive.connected ? <CloudDoneIcon /> : <CloudOffIcon />}
        sx={{ mb: 2 }}
        data-tour="archive-drive"
        action={
          <Button component={RouterLink} to="/backup" color="inherit" size="small">
            {t("Backup settings")}
          </Button>
        }
      >
        {d.drive.connected ? (
          <>
            {t("Google Drive connected")}: <b>{d.drive.email}</b> · {d.drive.nightly ? t("nightly backup at {time}", { time: d.drive.time }) : t("nightly backup is off")} · {t("folders by financial year")}
          </>
        ) : (
          t("Google Drive is not connected. Year archives are kept on the server only until you connect it (Backup & Restore → Connect Google Drive).")
        )}
      </Alert>

      {/* Running jobs */}
      {openJobs.length > 0 && (
        <Card sx={{ mb: 2, borderColor: "info.main" }} variant="outlined" data-tour="archive-running">
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              {t("Working now")}
            </Typography>
            {openJobs.map((j) => {
              const pct = j.rows_total ? Math.min(100, (j.rows_done * 100) / j.rows_total) : null;
              return (
                <Box key={j.job_id} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <CircularProgress size={16} />
                    <Typography sx={{ fontWeight: 600, flex: 1 }}>
                      {t(KIND[j.kind])} {j.fy_label || ""}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t(j.stage || j.status)} · {formatNumber(j.rows_done, 0)} {j.rows_total ? `/ ${formatNumber(j.rows_total, 0)}` : ""} {t("records")}
                    </Typography>
                    <Button size="small" color="error" startIcon={<StopIcon />} onClick={() => act(`stop${j.job_id}`, () => ArchiveServices.cancel(j.job_id))} disabled={Boolean(busy)}>
                      {t("Stop")}
                    </Button>
                  </Box>
                  <LinearProgress variant={pct === null ? "indeterminate" : "determinate"} value={pct ?? 0} sx={{ mt: 0.75, height: 8, borderRadius: 4 }} />
                </Box>
              );
            })}
            <Typography variant="caption" color="text.secondary">
              {t("You can leave this screen — the work continues in the background (cron job / open app) and starts again where it stopped.")}
            </Typography>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2}>
        {/* Settings */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: "100%" }} data-tour="archive-settings">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {t("How long to keep data in the app")}
              </Typography>
              <TextField select fullWidth size="small" label={t("Keep bills, payments, stock history for")} value={f.keep_years} onChange={(e) => setF({ ...f, keep_years: Number(e.target.value), auto_purge: Number(e.target.value) ? f.auto_purge : false })} sx={{ mb: 1.5 }}>
                {KEEP_YEARS.map((n) => (
                  <MenuItem key={n} value={n}>
                    {n ? t("{n} years (+ the running year)", { n }) : t("Never remove (keep everything)")}
                  </MenuItem>
                ))}
              </TextField>
              {f.keep_years > 0 && (
                <Alert severity="info" sx={{ mb: 1.5, py: 0 }}>
                  {t("Years before {date} can be removed after their archive is safe.", { date: `1 Apr ${new Date().getMonth() >= 3 ? new Date().getFullYear() - f.keep_years : new Date().getFullYear() - 1 - f.keep_years}` })}
                </Alert>
              )}
              <TextField select fullWidth size="small" label={t("Keep activity & message logs for")} value={f.logs_keep_months} onChange={(e) => setF({ ...f, logs_keep_months: Number(e.target.value) })} sx={{ mb: 1 }}>
                {LOG_MONTHS.map((n) => (
                  <MenuItem key={n} value={n}>
                    {n ? t("{n} months", { n }) : t("Forever")}
                  </MenuItem>
                ))}
              </TextField>
              <FormControlLabel control={<Switch checked={Boolean(f.auto_archive)} onChange={(e) => setF({ ...f, auto_archive: e.target.checked })} />} label={t("Make the FINAL archive of a year automatically (night of 1 April)")} />
              <FormControlLabel
                control={<Switch checked={Boolean(f.auto_purge)} disabled={!f.keep_years} onChange={(e) => setF({ ...f, auto_purge: e.target.checked })} />}
                label={t("Remove old years and logs automatically (one year a night, only after its archive is safe)")}
              />
              <FormControlLabel
                control={<Switch checked={Boolean(f.allow_local_archive)} onChange={(e) => setF({ ...f, allow_local_archive: e.target.checked })} />}
                label={t("Allow removing with an archive kept on the server (downloaded by me) when Drive is not connected")}
              />
              <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mt: 1 }}>
                {t("GST law: keep bill records for about 6 years. The FINAL archive file on Google Drive is that record — keep it even after a year is removed from the app. Check with your CA.")}
              </Alert>
              <Button variant="contained" sx={{ mt: 1.5 }} disabled={!changed || Boolean(busy)} onClick={() => act("save", () => ArchiveServices.saveSettings(f), (r) => setF({ ...r.data.settings }))}>
                {t("Save")}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Logs */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: "100%" }} data-tour="archive-logs">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {t("Old logs")}
              </Typography>
              {d.logs.cutoff ? (
                <>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {t("Older than {date}:", { date: d.logs.cutoff })} <b>{formatNumber(d.logs.activity_log, 0)}</b> {t("activity log entries")}, <b>{formatNumber(d.logs.messages, 0)}</b> {t("message log entries")},{" "}
                    <b>{formatNumber(d.logs.backup_logs, 0)}</b> {t("backup log entries")}.
                  </Typography>
                  <Button variant="outlined" color="error" startIcon={<DeleteSweepIcon />} disabled={Boolean(busy) || running || !(d.logs.activity_log + d.logs.messages + d.logs.backup_logs)} onClick={() => setLogsDlg({ word: "" })}>
                    {t("Remove old logs")}
                  </Button>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t("Logs are kept forever. Choose a period on the left to remove old activity and message logs.")}
                </Typography>
              )}
              <Typography variant="subtitle2" sx={{ mt: 2, fontWeight: 700 }}>
                {t("What is never removed")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("Customers, products, suppliers, settings; unpaid and part-paid bills (udhaar), pending orders, open cash shifts and unpaid supplier bills of any year. Old years keep their totals in reports.")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Years */}
      <Card sx={{ mt: 2 }} data-tour="archive-years">
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t("Financial years")}
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t("Year")}</TableCell>
                  <TableCell align="right">{t("Bills")}</TableCell>
                  <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                    {t("Sales")}
                  </TableCell>
                  <TableCell>{t("FINAL archive")}</TableCell>
                  <TableCell>{t("In the app")}</TableCell>
                  <TableCell align="right">{t("Actions")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {d.years.map((y) => {
                  const a = y.archive;
                  const archiving = Boolean(y.archive_job);
                  const purging = Boolean(y.purge_job);
                  return (
                    <TableRow key={y.fy} hover>
                      <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                        {y.fy_label}
                        {!y.finished && <Chip size="small" label={t("running")} sx={{ ml: 0.5 }} />}
                      </TableCell>
                      <TableCell align="right">{formatNumber(y.bills, 0)}</TableCell>
                      <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                        {formatCurrency(y.sales)}
                      </TableCell>
                      <TableCell>
                        {archiving ? (
                          <Chip size="small" color="info" label={t("making...")} />
                        ) : a ? (
                          <Tooltip title={`${a.file_name} · ${mb(a.file_size)} · ${formatNumber(a.rows, 0)} ${t("records")} · ${when(a.created_at)}`}>
                            <Chip size="small" color={a.on_drive ? "success" : a.safe ? "warning" : "default"} icon={a.on_drive ? <CloudDoneIcon /> : <ArchiveIcon />} label={a.on_drive ? t("On Google Drive") : t("Server only")} />
                          </Tooltip>
                        ) : y.finished ? (
                          <Chip size="small" variant="outlined" label={t("Not made")} />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {y.purged_at ? (
                          <Tooltip title={when(y.purged_at)}>
                            <Chip size="small" color="secondary" label={t("Removed (totals kept)")} />
                          </Tooltip>
                        ) : purging ? (
                          <Chip size="small" color="info" label={t("removing...")} />
                        ) : y.in_keep_period ? (
                          <Chip size="small" variant="outlined" color="success" label={t("Kept")} />
                        ) : (
                          <Chip size="small" variant="outlined" color="warning" label={t("Older than keep period")} />
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        {y.finished && !y.purged_at && (
                          <Button size="small" startIcon={<ArchiveIcon />} disabled={Boolean(busy) || archiving} onClick={() => act(`arc${y.fy}`, () => ArchiveServices.createArchive(y.fy))}>
                            {a ? t("Make again") : t("Make archive")}
                          </Button>
                        )}
                        {a?.local && (
                          <Button
                            size="small"
                            startIcon={<DownloadIcon />}
                            disabled={Boolean(busy)}
                            onClick={() => act(`dl${y.fy}`, async () => downloadBlob(await ArchiveServices.download(y.fy), a.file_name), load)}
                          >
                            {t("Download")}
                          </Button>
                        )}
                        {y.finished && !y.purged_at && !y.in_keep_period && (
                          <Tooltip title={y.purge_blocker ? t(y.purge_blocker) : ""}>
                            <span>
                              <Button size="small" color="error" startIcon={<DeleteSweepIcon />} disabled={Boolean(busy) || purging || running || Boolean(y.purge_blocker)} onClick={() => openPurge(y)}>
                                {t("Remove year")}
                              </Button>
                            </span>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
            {t("Steps for an old year: 1) Make archive (saved on Google Drive in its year folder and checked) → 2) Remove year (oldest first). Its totals stay in reports; bill-by-bill detail is in the archive file.")}
          </Typography>
        </CardContent>
      </Card>

      {/* History */}
      <Card sx={{ mt: 2 }} data-tour="archive-history">
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t("Log of backups, archives and removals")}
          </Typography>
          {d.jobs.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("Nothing yet.")}
            </Typography>
          ) : (
            <TableContainer sx={{ maxHeight: 420 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>{t("When")}</TableCell>
                    <TableCell>{t("What")}</TableCell>
                    <TableCell>{t("Status")}</TableCell>
                    <TableCell align="right">{t("Records")}</TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{t("Details")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {d.jobs.map((j) => (
                    <TableRow key={j.job_id}>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{when(j.finished_at || j.started_at || j.created_at)}</TableCell>
                      <TableCell>
                        {t(KIND[j.kind] || j.kind)} {j.fy_label || ""}
                        {j.file_name && (
                          <Typography variant="caption" color="text.secondary" component="div">
                            {j.file_name} {j.file_size ? `· ${mb(j.file_size)}` : ""}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" color={STATUS_COLOR[j.status] || "default"} label={t(j.status)} />
                      </TableCell>
                      <TableCell align="right">{formatNumber(j.rows_done, 0)}</TableCell>
                      <TableCell sx={{ display: { xs: "none", md: "table-cell" }, maxWidth: 420 }}>
                        <Typography variant="body2">{j.message}</Typography>
                        {j.kind !== "daily" && j.kind !== "archive" && j.counts && (
                          <Typography variant="caption" color="text.secondary">
                            {Object.entries(j.counts)
                              .map(([k, n]) => `${t(TABLE_LABEL[k] || k)}: ${formatNumber(n, 0)}`)
                              .join(" · ")}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Purge dialog */}
      <Dialog open={Boolean(purge)} onClose={() => !busy && setPurge(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: "error.main", display: "flex", gap: 1, alignItems: "center" }}>
          <WarningAmberIcon /> {t("Remove {year} from the app?", { year: purge?.label || "" })}
        </DialogTitle>
        <DialogContent>
          {!purge?.preview ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {purge.preview.blocker && (
                <Alert severity="error" sx={{ mb: 1.5 }}>
                  {t(purge.preview.blocker)}
                </Alert>
              )}
              <Alert severity="error" variant="filled" sx={{ mb: 1.5 }}>
                <AlertTitle sx={{ fontWeight: 700 }}>
                  {t("These records of {from} to {to} will be DELETED from the app:", { from: purge.preview.from, to: purge.preview.to })}
                </AlertTitle>
                {Object.entries(purge.preview.remove)
                  .filter(([, n]) => n > 0)
                  .map(([k, n]) => (
                    <div key={k}>
                      <b>{formatNumber(n, 0)}</b> × {t(TABLE_LABEL[k] || k)}
                    </div>
                  ))}
              </Alert>
              <Alert severity="success" sx={{ mb: 1.5 }}>
                <AlertTitle>{t("Kept in the app")}</AlertTitle>
                {Object.entries(purge.preview.kept).map(([k, n]) => (
                  <div key={k}>
                    {formatNumber(n, 0)} × {t(TABLE_LABEL[k] || k)}
                  </div>
                ))}
                <div>{t("Report totals of this year, customers, products and suppliers.")}</div>
              </Alert>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {t("The full year stays in the archive file")} <b>{purge.preview.archive?.file_name}</b>
                {purge.preview.archive?.drive_verified_at ? ` (${t("on Google Drive")})` : ""}.
              </Typography>
              <TextField fullWidth autoFocus size="small" color="error" label={t("Type PURGE to confirm")} value={purge.word} onChange={(e) => setPurge({ ...purge, word: e.target.value })} />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPurge(null)} disabled={Boolean(busy)}>
            {t("Cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!purge?.preview || Boolean(purge?.preview?.blocker) || purge?.word.trim().toUpperCase() !== "PURGE" || Boolean(busy)}
            onClick={() => act("purge", () => ArchiveServices.startPurge(purge.fy, purge.word), () => setPurge(null))}
          >
            {t("Remove year")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Logs dialog */}
      <Dialog open={Boolean(logsDlg)} onClose={() => !busy && setLogsDlg(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: "error.main" }}>{t("Remove old logs?")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            {t("Activity, message and backup logs older than {date} will be deleted. Bills and reports are not touched.", { date: d.logs.cutoff })}
          </Typography>
          <TextField fullWidth autoFocus size="small" color="error" label={t("Type PURGE to confirm")} value={logsDlg?.word || ""} onChange={(e) => setLogsDlg({ word: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogsDlg(null)}>{t("Cancel")}</Button>
          <Button
            variant="contained"
            color="error"
            disabled={(logsDlg?.word || "").trim().toUpperCase() !== "PURGE" || Boolean(busy)}
            onClick={() => act("logs", () => ArchiveServices.purgeLogs(logsDlg.word), () => setLogsDlg(null))}
          >
            {t("Remove old logs")}
          </Button>
        </DialogActions>
      </Dialog>

      <Stack direction="row" sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {t("Restore a year: Backup & Restore → Choose backup file → pick its FINAL file.")}{" "}
          <Link component={RouterLink} to="/backup">
            {t("Backup & Restore")}
          </Link>
        </Typography>
      </Stack>
    </Box>
  );
}
