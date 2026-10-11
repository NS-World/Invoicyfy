import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { Bar, BarChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart } from "recharts";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import Loader from "../../components/common/Loader";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import { ReportServices } from "../../services/ReportServices";
import { apiError, datePresets, downloadCsv, formatCompact, formatCurrency, formatDate, formatNumber } from "../../utils/format";

const monthLabel = (m) => {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
};

/** Simple responsive table with optional totals row. cols: [{ key, label, money?, align?, format? }] */
function ReportTable({ cols, rows, totals, emptyText = "No data for this period" }) {
  const fmt = (c, v) => (c.format ? c.format(v) : c.money ? formatCurrency(v, { symbol: false }) : v ?? "");
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small" sx={{ minWidth: Math.max(500, cols.length * 110) }}>
        <TableHead sx={{ bgcolor: "#f8fafc" }}>
          <TableRow>
            {cols.map((c) => (
              <TableCell key={c.key} align={c.money || c.align === "right" ? "right" : "left"} sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                {c.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={cols.length} align="center" sx={{ py: 4, color: "text.secondary" }}>
                {emptyText}
              </TableCell>
            </TableRow>
          )}
          {rows.map((r, i) => (
            <TableRow key={i} hover>
              {cols.map((c) => (
                <TableCell key={c.key} align={c.money || c.align === "right" ? "right" : "left"} sx={{ whiteSpace: "nowrap" }}>
                  {fmt(c, r[c.key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {totals && rows.length > 0 && (
            <TableRow sx={{ "& td": { fontWeight: 800, bgcolor: "#fafafa" } }}>
              {cols.map((c, i) => (
                <TableCell key={c.key} align={c.money || c.align === "right" ? "right" : "left"}>
                  {i === 0 ? "Total" : totals[c.key] !== undefined ? fmt(c, totals[c.key]) : ""}
                </TableCell>
              ))}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

const csv = (name, cols, rows) => downloadCsv(name, cols.map((c) => ({ label: c.label, key: c.key })), rows);

function ProfitLoss({ range }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setData(null);
    ReportServices.profitLoss(range).then(setData).catch((e) => setError(apiError(e)));
  }, [range]);
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Loader />;
  const t = data.totals;
  const cols = [
    { key: "label", label: "Month" },
    { key: "sales", label: "Sales (incl. GST)", money: true },
    { key: "net_sales", label: "Net Sales", money: true },
    { key: "cost_of_goods", label: "Cost of Goods", money: true },
    { key: "expenses", label: "Expenses", money: true },
    { key: "profit", label: "Profit", money: true },
  ];
  const rows = data.monthly.map((r) => ({ ...r, label: monthLabel(r.month) }));
  return (
    <>
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Income (net of GST)" value={formatCurrency(t.net_sales)} hint={`Billed ${formatCurrency(t.sales)}`} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Expenses" value={formatCurrency(t.expenses)} color="error.main" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Net Profit" value={formatCurrency(t.profit)} color={t.profit >= 0 ? "success.main" : "error.main"} hint={`Margin ${t.margin_percent}%`} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Gross profit (on cost)" value={formatCurrency(t.gross_profit)} hint={`COGS ${formatCurrency(t.cost_of_goods)}`} />
        </Grid>
      </Grid>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          Income vs Expenses
        </Typography>
        <Box sx={{ height: 280 }}>
          <ResponsiveContainer>
            <ComposedChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis tickFormatter={formatCompact} fontSize={12} width={60} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="net_sales" name="Income" fill="#045864" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#ef6c00" radius={[4, 4, 0, 0]} />
              <Line dataKey="profit" name="Profit" stroke="#2e7d32" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Month-wise
            </Typography>
            <Button size="small" startIcon={<DownloadIcon />} onClick={() => csv(`profit_loss_${range.from}_${range.to}.csv`, cols, rows)}>
              CSV
            </Button>
          </Box>
          <ReportTable cols={cols} rows={rows} totals={t} />
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Expenses by category
          </Typography>
          <ReportTable cols={[{ key: "category", label: "Category" }, { key: "amount", label: "Amount", money: true }]} rows={data.expenses_by_category} />
        </Grid>
      </Grid>
    </>
  );
}

const SALES_COLS = {
  day: [{ key: "label", label: "Date", format: (v) => formatDate(v) }],
  month: [{ key: "label", label: "Month", format: monthLabel }],
  product: [{ key: "label", label: "Product" }, { key: "quantity", label: "Qty", align: "right", format: (v) => formatNumber(v, 3) }],
  customer: [{ key: "label", label: "Customer" }, { key: "gstin", label: "GSTIN" }],
};

function SalesRegister({ range }) {
  const [group, setGroup] = useState("day");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setData(null);
    ReportServices.sales({ ...range, group }).then(setData).catch((e) => setError(apiError(e)));
  }, [range, group]);
  const cols = [
    ...SALES_COLS[group],
    { key: "invoices", label: "Bills", align: "right" },
    { key: "taxable_value", label: "Taxable", money: true },
    { key: "tax_amount", label: "GST", money: true },
    { key: "total_amount", label: "Total", money: true },
    ...(group === "product" ? [{ key: "cost", label: "Cost", money: true }] : [{ key: "balance_due", label: "Due", money: true }]),
  ];
  return (
    <>
      <Box sx={{ display: "flex", gap: 1, justifyContent: "space-between", mb: 2, flexWrap: "wrap" }}>
        <TextField select label="Group by" value={group} onChange={(e) => setGroup(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="day">Day</MenuItem>
          <MenuItem value="month">Month</MenuItem>
          <MenuItem value="product">Product</MenuItem>
          <MenuItem value="customer">Customer</MenuItem>
        </TextField>
        <Button startIcon={<DownloadIcon />} disabled={!data} onClick={() => csv(`sales_${group}_${range.from}_${range.to}.csv`, cols, data.data)}>
          Export CSV
        </Button>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      {!data ? <Loader /> : <ReportTable cols={cols} rows={data.data} totals={data.totals} />}
    </>
  );
}

function GstSummary({ range }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setData(null);
    ReportServices.gstSummary(range).then(setData).catch((e) => setError(apiError(e)));
  }, [range]);
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Loader />;
  const t = data.totals;
  const taxCols = [
    { key: "taxable_value", label: "Taxable", money: true },
    { key: "cgst_amount", label: "CGST", money: true },
    { key: "sgst_amount", label: "SGST", money: true },
    { key: "igst_amount", label: "IGST", money: true },
    { key: "tax_amount", label: "Total Tax", money: true },
  ];
  const b2bCols = [
    { key: "invoice_number", label: "Invoice No" },
    { key: "invoice_date", label: "Date", format: (v) => formatDate(v) },
    { key: "customer_gstin", label: "GSTIN" },
    { key: "customer_name", label: "Buyer" },
    { key: "place_of_supply", label: "Place of Supply" },
    ...taxCols,
    { key: "total_amount", label: "Invoice Value", money: true },
  ];
  const b2cCols = [{ key: "place_of_supply", label: "Place of Supply" }, { key: "gst_rate", label: "Rate %", align: "right" }, ...taxCols];
  const hsnCols = [
    { key: "hsn_code", label: "HSN/SAC" },
    { key: "description", label: "Description" },
    { key: "unit", label: "UQC" },
    { key: "quantity", label: "Qty", align: "right", format: (v) => formatNumber(v, 3) },
    { key: "gst_rate", label: "Rate %", align: "right" },
    { key: "total_amount", label: "Total Value", money: true },
    ...taxCols,
  ];
  const sum = (rows, cols) => Object.fromEntries(cols.filter((c) => c.money).map((c) => [c.key, rows.reduce((s, r) => s + Number(r[c.key] || 0), 0)]));
  const Section = ({ title, cols, rows, file }) => (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Button size="small" startIcon={<DownloadIcon />} onClick={() => csv(`${file}_${range.from}_${range.to}.csv`, cols, rows)} disabled={!rows.length}>
          CSV
        </Button>
      </Box>
      <ReportTable cols={cols} rows={rows} totals={sum(rows, cols)} />
    </Box>
  );
  return (
    <>
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Taxable turnover" value={formatCurrency(t.taxable_value)} hint={`${t.invoices} invoices · ${t.cancelled_invoices} cancelled`} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Output GST" value={formatCurrency(t.tax_amount)} hint={`CGST ${formatCompact(t.cgst_amount)} · SGST ${formatCompact(t.sgst_amount)} · IGST ${formatCompact(t.igst_amount)}`} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Input tax credit (expenses)" value={formatCurrency(data.input_tax_credit)} color="success.main" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Estimated GST payable" value={formatCurrency(data.net_gst_payable)} color="error.main" />
        </Grid>
      </Grid>
      <Alert severity="info" sx={{ mb: 2 }}>
        Use these tables to fill GSTR-1 (B2B, B2C, HSN) and GSTR-3B. Please verify with your CA before filing.
      </Alert>
      <Section title="Rate-wise summary" cols={[{ key: "gst_rate", label: "GST Rate %" }, ...taxCols]} rows={data.by_rate} file="gst_rate_wise" />
      <Section title="B2B invoices (registered buyers)" cols={b2bCols} rows={data.b2b} file="gstr1_b2b" />
      <Section title="B2C summary (unregistered buyers)" cols={b2cCols} rows={data.b2c} file="gstr1_b2c" />
      <Section title="HSN-wise summary" cols={hsnCols} rows={data.hsn} file="gstr1_hsn" />
    </>
  );
}

export default function Reports() {
  const [tab, setTab] = useState("pl");
  const [range, setRange] = useState(() => {
    const p = datePresets().find((x) => x.key === "month");
    return { from: p.from, to: p.to };
  });
  return (
    <>
      <PageHeader title="Reports" actions={<DateRangeFilter value={range} onChange={setRange} />} />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ mb: 2 }}>
        <Tab value="pl" label="Profit & Loss" />
        <Tab value="sales" label="Sales Register" />
        <Tab value="gst" label="GST Summary" />
      </Tabs>
      {tab === "pl" && <ProfitLoss range={range} />}
      {tab === "sales" && <SalesRegister range={range} />}
      {tab === "gst" && <GstSummary range={range} />}
    </>
  );
}
