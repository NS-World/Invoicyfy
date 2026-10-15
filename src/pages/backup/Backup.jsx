import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RestoreIcon from "@mui/icons-material/Restore";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import { useAuth } from "../../context/useAuth";
import { useNotify } from "../../context/NotifyProvider";
import { BackupServices } from "../../services/BackupServices";
import { apiError } from "../../utils/format";
import { createBackup, downloadErrorFile, readBackupFile, readJsonBackup, restoreBackup } from "./backupFile";
import DriveBackup from "./DriveBackup";
import { useT } from "../../context/PrefsContext";

const when = (v) => (v ? new Date(String(v).replace(" ", "T")).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "Never");
const daysSince = (v) => (v ? Math.floor((Date.now() - new Date(String(v).replace(" ", "T")).getTime()) / 86400000) : null);

export default function Backup() {
  const t = useT();
  const notify = useNotify();
  const { can, isAdmin } = useAuth();
  const canImport = can("backup", "add");
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(null); // { mode: "export" | "read" | "import", table, percent }
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [results, setResults] = useState(null);
  const inputRef = useRef(null);

  const load = useCallback(() => {
    BackupServices.tables()
      .then((r) => setInfo(r.data))
      .catch((e) => notify(apiError(e), "error"));
  }, [notify]);
  useEffect(load, [load]);

  const runExport = async () => {
    setBusy({ mode: "export", table: "", percent: 0 });
    try {
      const res = await createBackup((p) => setBusy({ mode: "export", ...p }));
      notify(`Backup downloaded: ${res.fileName}`);
      load();
    } catch (e) {
      notify(apiError(e) || "Backup failed", "error");
    }
    setBusy(null);
  };

  const pickFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const isJson = /\.json(\.gz)?$/i.test(f.name);
    if (!/\.xlsx$/i.test(f.name) && !isJson) {
      notify(t("Please choose an Excel (.xlsx) backup file"), "error");
      return;
    }
    setResults(null);
    setBusy({ mode: "read", table: f.name, percent: 0 });
    try {
      const p = isJson ? await readJsonBackup(f, info.tables) : await readBackupFile(f, info.tables);
      if (!Object.keys(p.sheets).length) {
        notify(t("No matching sheets found. Use a file downloaded from this screen."), "error");
        setParsed(null);
      } else {
        setFile(f);
        setParsed(p);
      }
    } catch (err) {
      notify(isJson ? err.message || t("Could not read this file") : t("Could not read this file. Is it a valid Excel file?"), "error");
    }
    setBusy(null);
  };

  const runImport = async () => {
    setBusy({ mode: "import", table: "", percent: 0 });
    try {
      const res = await restoreBackup(parsed, info.tables, (p) => setBusy({ mode: "import", ...p }));
      setResults(res);
      const sum = (k) => res.reduce((s, r) => s + r[k], 0);
      BackupServices.log({
        action: "import",
        file_name: file.name,
        summary: { inserted: sum("inserted"), merged: sum("merged"), duplicate: sum("duplicate"), error: sum("error") },
      }).catch(() => {});
      notify(`Import finished: ${sum("inserted")} added, ${sum("duplicate")} already existed, ${sum("error")} errors`, sum("error") ? "warning" : "success");
      setParsed(null);
      load();
    } catch (e) {
      notify(apiError(e), "error");
    }
    setBusy(null);
  };

  if (!info) return <Loader />;
  const age = daysSince(info.last_backup_at);
  const totalRecords = info.tables.reduce((s, t) => s + t.count, 0);
  const anyApprox = info.tables.some((t) => t.approx);
  const issueCount = results ? results.reduce((s, r) => s + r.issues.length, 0) : 0;

  return (
    <Box>
      <PageHeader title={t("Backup & Restore")} subtitle={t("Download all your business data to Excel and bring it back any time")} />

      {age === null || age > 7 ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {age === null ? "You have never taken a backup." : `Last backup was ${age} days ago.`} Take a backup regularly and keep the file on
          Google Drive or a pen drive, so your data is safe even if this computer or server crashes.
        </Alert>
      ) : null}
      {!info.is_full && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t("Stores, users and roles are included only when an Admin takes the backup.")}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1 }}>
                <CloudDownloadIcon color="primary" />
                <Typography variant="h6">{t("Download backup")}</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                One Excel file with every table ({anyApprox ? "~" : ""}{totalRecords.toLocaleString("en-IN")} records): customers, products, orders, invoices,
                payments, expenses, stock and settings. Last backup: <b>{when(info.last_backup_at)}</b>
              </Typography>
              <Button variant="contained" startIcon={<CloudDownloadIcon />} onClick={runExport} disabled={!!busy} fullWidth>
                {t("Download full backup (.xlsx)")}
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1 }}>
                <CloudUploadIcon color="secondary" />
                <Typography variant="h6">{t("Import backup")}</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choose a backup file. New records are added; records that already exist are <b>never overwritten</b> — they are skipped
                and listed in an error file you can download.
              </Typography>
              <input ref={inputRef} type="file" accept=".xlsx,.json,.gz" hidden onChange={pickFile} />
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<CloudUploadIcon />}
                onClick={() => inputRef.current?.click()}
                disabled={!!busy || !canImport}
                fullWidth
              >
                {canImport ? "Choose backup file" : "You don't have permission to import"}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {isAdmin && <DriveBackup />}

      {busy && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {busy.mode === "export" ? "Preparing backup" : busy.mode === "read" ? "Reading file" : "Importing"}
              {busy.table ? ` — ${busy.table}` : ""}… please keep this page open.
            </Typography>
            <LinearProgress variant={busy.mode === "read" ? "indeterminate" : "determinate"} value={busy.percent || 0} />
          </CardContent>
        </Card>
      )}

      {parsed && !busy && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Ready to import: {file?.name}
            </Typography>
            {!parsed.isBackup && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {t("This file was not created by Invoicyfy backup, but matching sheets were found. Each row will be checked before saving.")}
              </Alert>
            )}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Sheet</TableCell>
                    <TableCell align="right">Rows in file</TableCell>
                    <TableCell align="right">Now in app</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {info.tables
                    .filter((t) => parsed.sheets[t.table])
                    .map((t) => (
                      <TableRow key={t.table}>
                        <TableCell>{t.label}</TableCell>
                        <TableCell align="right">{parsed.sheets[t.table].rows.length}</TableCell>
                        <TableCell align="right">{t.approx ? "~" : ""}{t.count.toLocaleString("en-IN")}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}>
              <Button variant="contained" startIcon={<RestoreIcon />} onClick={runImport}>
                {t("Start import")}
              </Button>
              <Button onClick={() => setParsed(null)}>{t("Cancel")}</Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {results && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, mb: 1 }}>
              <Typography variant="h6">{t("Import result")}</Typography>
              {issueCount > 0 && (
                <Button color="error" variant="contained" startIcon={<ErrorOutlineIcon />} onClick={() => downloadErrorFile(results, file?.name || "backup.xlsx")}>
                  Download error file ({issueCount})
                </Button>
              )}
            </Stack>
            {issueCount === 0 && <Alert severity="success" sx={{ mb: 1 }}>All rows were imported successfully.</Alert>}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Sheet</TableCell>
                    <TableCell align="right">In file</TableCell>
                    <TableCell align="right">Added</TableCell>
                    <TableCell align="right">Already exists</TableCell>
                    <TableCell align="right">Errors</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.table}>
                      <TableCell>
                        {r.label}
                        {Object.entries(r.notes).map(([note, n]) => (
                          <Typography key={note} variant="caption" display="block" color="text.secondary">
                            {note} ({n})
                          </Typography>
                        ))}
                      </TableCell>
                      <TableCell align="right">{r.total}</TableCell>
                      <TableCell align="right">{r.inserted + r.merged}</TableCell>
                      <TableCell align="right">{r.duplicate ? <Chip size="small" color="warning" label={r.duplicate} /> : 0}</TableCell>
                      <TableCell align="right">{r.error ? <Chip size="small" color="error" label={r.error} /> : 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t("History")}
          </Typography>
          {info.logs.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("No backups yet.")}
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>File</TableCell>
                    <TableCell>By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {info.logs.map((l) => (
                    <TableRow key={l.backup_id}>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{when(l.created_at)}</TableCell>
                      <TableCell>
                        <Chip size="small" label={l.action === "export" ? "Backup" : "Import"} color={l.action === "export" ? "primary" : "secondary"} variant="outlined" />
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" }, wordBreak: "break-all" }}>{l.file_name}</TableCell>
                      <TableCell>{l.user_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
