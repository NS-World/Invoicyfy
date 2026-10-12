import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Grid, MenuItem, Paper, TextField, Typography } from "@mui/material";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import StatCard from "../../components/common/StatCard";
import Loader from "../../components/common/Loader";
import ExportMenu from "../../components/common/ExportMenu";
import ReportTable from "../../components/report/ReportTable";
import { useAuth } from "../../context/useAuth";
import { ReportServices } from "../../services/ReportServices";
import { apiError, formatCompact, formatCurrency, formatDate, formatNumber } from "../../utils/format";
import { WEEKDAYS, monthLabel, toExportCols } from "../../utils/reportHelpers";
import { useT } from "../../context/PrefsContext";

const currentFyStart = () => {
  const d = new Date();
  return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
};
const fyLabel = (y) => `FY ${y}-${String((y + 1) % 100).padStart(2, "0")}`;
const growthText = (g) => (g === null || g === undefined ? "No data for last year" : `${g >= 0 ? "▲" : "▼"} ${Math.abs(g)}% vs last year`);

const MONTH_COLS = [
  { key: "label", label: "Month" },
  { key: "bills", label: "Bills", align: "right", type: "number", total: true },
  { key: "net_sales", label: "Net Sales", money: true },
  { key: "tax", label: "GST", money: true },
  { key: "sales", label: "Total Sales", money: true },
  { key: "collected", label: "Collected", money: true },
  { key: "expenses", label: "Expenses", money: true },
  { key: "profit", label: "Profit", money: true },
];
const MONTH_EXPORT_COLS = [
  ...MONTH_COLS,
  { key: "cgst", label: "CGST", money: true },
  { key: "sgst", label: "SGST", money: true },
  { key: "igst", label: "IGST", money: true },
];
const PRODUCT_COLS = [
  { key: "name", label: "Product" },
  { key: "quantity", label: "Qty sold", align: "right", type: "qty", format: (v) => formatNumber(v, 3) },
  { key: "sales", label: "Sales", money: true },
  { key: "margin", label: "Margin", money: true },
];
const CATEGORY_COLS = [
  { key: "category", label: "Category" },
  { key: "quantity", label: "Qty", align: "right", type: "qty", format: (v) => formatNumber(v, 3) },
  { key: "sales", label: "Sales", money: true },
];
const CUSTOMER_COLS = [
  { key: "name", label: "Customer" },
  { key: "phone", label: "Phone" },
  { key: "bills", label: "Bills", align: "right", type: "number", total: true },
  { key: "sales", label: "Sales", money: true },
  { key: "balance_due", label: "Due", money: true },
];
const PAYMENT_COLS = [
  { key: "method", label: "Mode" },
  { key: "count", label: "Payments", align: "right", type: "number", total: true },
  { key: "amount", label: "Amount", money: true },
];
const ORDER_TYPE_COLS = [
  { key: "type", label: "Order type" },
  { key: "bills", label: "Bills", align: "right", type: "number", total: true },
  { key: "sales", label: "Sales", money: true },
];
const GST_COLS = [
  { key: "gst_rate", label: "GST Rate %", align: "right", type: "number" },
  { key: "taxable_value", label: "Taxable", money: true },
  { key: "cgst", label: "CGST", money: true },
  { key: "sgst", label: "SGST", money: true },
  { key: "igst", label: "IGST", money: true },
  { key: "tax", label: "Total GST", money: true },
];
const EXPENSE_COLS = [
  { key: "category", label: "Category" },
  { key: "count", label: "Entries", align: "right", type: "number", total: true },
  { key: "amount", label: "Amount", money: true },
];
const WEEKDAY_COLS = [
  { key: "label", label: "Day" },
  { key: "bills", label: "Bills", align: "right", type: "number", total: true },
  { key: "sales", label: "Sales", money: true },
];

const sumOf = (rows, cols) => Object.fromEntries(cols.filter((c) => c.money || c.total).map((c) => [c.key, rows.reduce((s, r) => s + Number(r[c.key] || 0), 0)]));

function Block({ title, cols, rows, totals }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      <ReportTable cols={cols} rows={rows} totals={totals ? sumOf(rows, cols) : null} />
    </Box>
  );
}

export default function AnnualReport() {
  const t = useT();
  const { user } = useAuth();
  const [fy, setFy] = useState(currentFyStart());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const years = useMemo(() => Array.from({ length: 6 }, (_, i) => currentFyStart() - i), []);

  useEffect(() => {
    setData(null);
    setError("");
    ReportServices.annual({ fy }).then(setData).catch((e) => setError(apiError(e)));
  }, [fy]);

  const months = data ? data.monthly.map((r) => ({ ...r, label: monthLabel(r.month) })) : [];
  const weekdays = data ? data.weekdays.map((r) => ({ ...r, label: WEEKDAYS[r.day] })) : [];

  const build = () => {
    const t = data.totals;
    const p = data.previous;
    const sec = (heading, cols, rows, totals = false) => ({ heading, columns: toExportCols(cols), rows, totals: totals ? true : undefined });
    return {
      title: `${user?.store_name || "Business"} — Annual Report ${fyLabel(data.fy_start)}`,
      subtitle: `${formatDate(data.range.from)} – ${formatDate(data.range.to)}`,
      filename: `annual-report-${data.fy}`,
      sections: [
        {
          heading: "Summary",
          summary: [
            { label: "Total sales (incl. GST)", value: t.sales, type: "money" },
            { label: "Net sales (excl. GST)", value: t.net_sales, type: "money" },
            { label: "GST collected", value: t.tax, type: "money" },
            { label: "Bills", value: t.bills, type: "number" },
            { label: "Average bill", value: t.average_bill, type: "money" },
            { label: "Cost of goods sold", value: t.cost_of_goods, type: "money" },
            { label: "Gross profit", value: t.gross_profit, type: "money" },
            { label: "Expenses", value: t.expenses, type: "money" },
            { label: "Net profit", value: t.profit, type: "money" },
            { label: "Payments collected", value: t.collected, type: "money" },
            { label: "Outstanding (to collect)", value: t.outstanding, type: "money" },
            { label: `Last year sales (${fyLabel(data.fy_start - 1)})`, value: p.sales, type: "money" },
            { label: "Last year net profit", value: p.profit, type: "money" },
            { label: "Sales growth", value: data.growth.sales === null ? "—" : `${data.growth.sales}%` },
          ],
        },
        sec("Month-wise", MONTH_EXPORT_COLS, months, true),
        sec("Top products", PRODUCT_COLS, data.top_products),
        sec("Sales by category", CATEGORY_COLS, data.categories, true),
        sec("Top customers", CUSTOMER_COLS, data.top_customers),
        sec("Payment modes", PAYMENT_COLS, data.payment_modes, true),
        sec("Order types", ORDER_TYPE_COLS, data.order_types, true),
        sec("GST rate-wise", GST_COLS, data.gst_rates, true),
        sec("Expenses by category", EXPENSE_COLS, data.expenses_by_category, true),
        sec("Sales by weekday", WEEKDAY_COLS, weekdays, true),
      ],
    };
  };

  return (
    <>
      <Box sx={{ display: "flex", gap: 1, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", mb: 2 }}>
        <TextField select size="small" label={t("Financial year")} value={fy} onChange={(e) => setFy(Number(e.target.value))} sx={{ minWidth: 160 }}>
          {years.map((y) => (
            <MenuItem key={y} value={y}>
              {fyLabel(y)}
            </MenuItem>
          ))}
        </TextField>
        <ExportMenu build={build} label={t("Download annual report")} variant="contained" disabled={!data} />
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      {!data && !error && <Loader />}
      {data && (
        <>
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard label={t("Total sales")} value={formatCurrency(data.totals.sales)} hint={growthText(data.growth.sales)} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard label={t("Net profit")} value={formatCurrency(data.totals.profit)} color={data.totals.profit >= 0 ? "success.main" : "error.main"} hint={growthText(data.growth.profit)} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard label={t("Bills")} value={data.totals.bills.toLocaleString("en-IN")} hint={`Avg bill ${formatCurrency(data.totals.average_bill)}`} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard label={t("Collected")} value={formatCurrency(data.totals.collected)} hint={`Outstanding ${formatCurrency(data.totals.outstanding)}`} />
            </Grid>
          </Grid>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              {fyLabel(data.fy_start)} — month by month
            </Typography>
            <Box sx={{ height: 280 }}>
              <ResponsiveContainer>
                <ComposedChart data={months}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis tickFormatter={formatCompact} fontSize={12} width={60} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="sales" name="Sales" fill="#045864" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef6c00" radius={[4, 4, 0, 0]} />
                  <Line dataKey="profit" name="Profit" stroke="#2e7d32" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
          <Block title={t("Month-wise")} cols={MONTH_COLS} rows={months} totals />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Block title={t("Top products")} cols={PRODUCT_COLS} rows={data.top_products} />
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <Block title={t("Sales by category")} cols={CATEGORY_COLS} rows={data.categories} totals />
              <Block title={t("Payment modes")} cols={PAYMENT_COLS} rows={data.payment_modes} totals />
            </Grid>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Block title={t("Top customers")} cols={CUSTOMER_COLS} rows={data.top_customers} />
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <Block title={t("Order types")} cols={ORDER_TYPE_COLS} rows={data.order_types} totals />
              <Block title={t("Sales by weekday")} cols={WEEKDAY_COLS} rows={weekdays} totals />
            </Grid>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Block title={t("GST rate-wise")} cols={GST_COLS} rows={data.gst_rates} totals />
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <Block title={t("Expenses by category")} cols={EXPENSE_COLS} rows={data.expenses_by_category} totals />
            </Grid>
          </Grid>
        </>
      )}
    </>
  );
}
