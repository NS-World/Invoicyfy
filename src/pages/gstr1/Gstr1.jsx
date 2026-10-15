import { useState } from "react";
import { Alert, Box, Button, Grid, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import GridOnIcon from "@mui/icons-material/GridOn";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import StorePicker from "../../components/v3/StorePicker";
import useStoreId from "../../hooks/useStoreId";
import { V4ReportServices } from "../../services/V4Services";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { apiError, formatCurrency } from "../../utils/format";
import { XLSX_MIME, downloadBlob, loadExcel } from "../../utils/download";

const months = () => {
  const out = [];
  const d = new Date();
  for (let i = 0; i < 15; i++) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push({ value: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`, label: m.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) });
  }
  return out;
};

/** GSTR-1 for a month: JSON for the GST portal / offline tool, and the same tables in Excel. */
export default function Gstr1() {
  const t = useT();
  const notify = useNotify();
  const [storeId, setStoreId] = useStoreId();
  const list = months();
  const [month, setMonth] = useState(list[1].value);
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);

  const prepare = async () => {
    setBusy(true);
    try {
      setD(await V4ReportServices.gstr1({ month, store_id: storeId || undefined }));
    } catch (e) {
      notify(apiError(e), "error");
    }
    setBusy(false);
  };
  const name = d ? `GSTR1_${d.store.gstin || "NOGSTIN"}_${d.json.fp}` : "";
  const downloadJson = () => downloadBlob(new Blob([JSON.stringify(d.json)], { type: "application/json" }), `${name}.json`);
  const downloadExcel = async () => {
    const ExcelJS = await loadExcel();
    const wb = new ExcelJS.Workbook();
    Object.entries(d.sheets).forEach(([sheet, rows]) => {
      const ws = wb.addWorksheet(sheet);
      if (!rows.length) {
        ws.addRow([t("No entries this month")]);
        return;
      }
      const cols = Object.keys(rows[0]);
      const head = ws.addRow(cols);
      head.font = { bold: true, color: { argb: "FFFFFFFF" } };
      head.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A237E" } }));
      rows.forEach((r) => ws.addRow(cols.map((c) => r[c])));
      cols.forEach((c, i) => (ws.getColumn(i + 1).width = Math.min(Math.max(c.length + 2, 12), 40)));
    });
    downloadBlob(new Blob([await wb.xlsx.writeBuffer()], { type: XLSX_MIME }), `${name}.xlsx`);
  };
  const s = d?.summary;

  return (
    <>
      <PageHeader title="GSTR-1 file" subtitle="Monthly sales return in the GST portal format" actions={<StorePicker value={storeId} onChange={setStoreId} />} />
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 2 }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          <TextField select label={t("Month")} value={month} onChange={(e) => {
            setMonth(e.target.value);
            setD(null);
          }} sx={{ minWidth: 200 }}>
            {list.map((m) => (
              <MenuItem key={m.value} value={m.value}>
                {m.label}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="contained" onClick={prepare} disabled={busy}>
            {busy ? t("Preparing...") : t("Prepare GSTR-1")}
          </Button>
          {d && (
            <>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadJson}>
                {t("JSON for GST portal")}
              </Button>
              <Button variant="outlined" startIcon={<GridOnIcon sx={{ color: "#1D6F42" }} />} onClick={downloadExcel}>
                {t("Excel")}
              </Button>
            </>
          )}
        </Box>
        <Alert severity="info" sx={{ mt: 2 }}>
          {t("Upload the JSON on gst.gov.in > Returns > GSTR-1 > Prepare offline > Upload, or open it in the GST offline tool first to check. Cancelled bills are left out and shown under Documents issued. Credit / debit notes and Swiggy / Zomato sales under section 9(5) are not included: please confirm those with your CA.")}
        </Alert>
      </Paper>
      {d && (
        <>
          {d.warnings.map((w) => (
            <Alert key={w} severity="warning" sx={{ mb: 1 }}>
              {t(w)}
            </Alert>
          ))}
          <Grid container data-tour="screen-main" spacing={1.5} sx={{ mb: 2 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard label="Taxable value" value={formatCurrency(s.taxable)} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard label="CGST + SGST" value={formatCurrency(s.cgst + s.sgst)} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard label="IGST" value={formatCurrency(s.igst)} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard label="Bills issued" value={s.documents} hint={`${s.cancelled} ${t("cancelled")}`} />
            </Grid>
          </Grid>
          <Paper sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>{t("Section")}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    {t("Entries")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{t("What it has")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  ["4A B2B", d.sheets.b2b.length, `${s.b2b_invoices} ${t("bills to GST-registered buyers")} · ${formatCurrency(s.b2b_taxable)}`],
                  ["5 B2C Large", d.sheets.b2cl.length, t("Other-state bills above ₹1 lakh without GSTIN")],
                  ["7 B2C Small", d.sheets.b2cs.length, `${t("All other sales, by state and GST rate")} · ${formatCurrency(s.b2cs_taxable)}`],
                  ["12 HSN (B2B)", d.sheets["hsn(b2b)"].length, t("HSN-wise summary of B2B sales")],
                  ["12 HSN (B2C)", d.sheets["hsn(b2c)"].length, t("HSN-wise summary of B2C sales")],
                  ["13 Documents", d.sheets.docs.length, t("Bill number series with cancelled count")],
                ].map(([k, n, w]) => (
                  <TableRow key={k}>
                    <TableCell>{k}</TableCell>
                    <TableCell align="right">{n}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{w}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </>
  );
}
