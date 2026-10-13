import { useEffect, useState } from "react";
import { Alert, Box, Grid, MenuItem, Paper, Tab, Tabs, TextField, Typography } from "@mui/material";
import { Bar, BarChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart } from "recharts";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import Loader from "../../components/common/Loader";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import { ReportServices } from "../../services/ReportServices";
import ExportMenu from "../../components/common/ExportMenu";
import ReportTable from "../../components/report/ReportTable";
import { useAuth } from "../../context/useAuth";
import { apiError, datePresets, formatCompact, formatCurrency, formatDate, formatNumber } from "../../utils/format";
import { monthLabel, toExportCols } from "../../utils/reportHelpers";
import AnnualReport from "./AnnualReport";
import { useT } from "../../context/PrefsContext";

const periodText = (range) => `${formatDate(range.from)} – ${formatDate(range.to)}`;
const sec = (heading, cols, rows, totals) => ({ heading, columns: toExportCols(cols), rows, totals });

function ProfitLoss({ range, shop }) {
  const t = useT();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setData(null);
    ReportServices.profitLoss(range).then(setData).catch((e) => setError(apiError(e)));
  }, [range]);
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Loader />;
  const tot = data.totals;
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
          <StatCard label={t("Income (net of GST)")} value={formatCurrency(tot.net_sales)} hint={`Billed ${formatCurrency(tot.sales)}`} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label={t("Expenses")} value={formatCurrency(tot.expenses)} color="error.main" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label={t("Net Profit")} value={formatCurrency(tot.profit)} color={tot.profit >= 0 ? "success.main" : "error.main"} hint={`Margin ${tot.margin_percent}%`} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label={t("Gross profit (on cost)")} value={formatCurrency(tot.gross_profit)} hint={`COGS ${formatCurrency(tot.cost_of_goods)}`} />
        </Grid>
      </Grid>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          {t("Income vs Expenses")}
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
              {t("Month-wise")}
            </Typography>
            <ExportMenu
              size="small"
              build={() => ({
                title: `${shop} — Profit & Loss`,
                subtitle: periodText(range),
                filename: `profit-loss-${range.from}-${range.to}`,
                sections: [
                  {
                    heading: "Summary",
                    summary: [
                      { label: "Sales (incl. GST)", value: tot.sales, type: "money" },
                      { label: "Income (net of GST)", value: tot.net_sales, type: "money" },
                      { label: "Cost of goods", value: tot.cost_of_goods, type: "money" },
                      { label: "Gross profit", value: tot.gross_profit, type: "money" },
                      { label: "Expenses", value: tot.expenses, type: "money" },
                      { label: "Net profit", value: tot.profit, type: "money" },
                      { label: "Margin %", value: tot.margin_percent, type: "percent" },
                    ],
                  },
                  sec("Month-wise", cols, rows, true),
                  sec("Expenses by category", [{ key: "category", label: "Category" }, { key: "amount", label: "Amount", money: true }], data.expenses_by_category, true),
                ],
              })}
            />
          </Box>
          <ReportTable cols={cols} rows={rows} totals={t} />
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            {t("Expenses by category")}
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
  product: [{ key: "label", label: "Product" }, { key: "quantity", label: "Qty", align: "right", type: "qty", format: (v) => formatNumber(v, 3) }],
  customer: [{ key: "label", label: "Customer" }, { key: "gstin", label: "GSTIN" }],
};

function SalesRegister({ range, shop }) {
  const t = useT();
  const [group, setGroup] = useState("day");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setData(null);
    ReportServices.sales({ ...range, group }).then(setData).catch((e) => setError(apiError(e)));
  }, [range, group]);
  const cols = [
    ...SALES_COLS[group],
    { key: "invoices", label: "Bills", align: "right", type: "number", total: true },
    { key: "taxable_value", label: "Taxable", money: true },
    { key: "tax_amount", label: "GST", money: true },
    { key: "total_amount", label: "Total", money: true },
    ...(group === "product" ? [{ key: "cost", label: "Cost", money: true }] : [{ key: "balance_due", label: "Due", money: true }]),
  ];
  return (
    <>
      <Box sx={{ display: "flex", gap: 1, justifyContent: "space-between", mb: 2, flexWrap: "wrap" }}>
        <TextField select label={t("Group by")} value={group} onChange={(e) => setGroup(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="day">{t("Day")}</MenuItem>
          <MenuItem value="month">{t("Month")}</MenuItem>
          <MenuItem value="product">{t("Product")}</MenuItem>
          <MenuItem value="customer">{t("Customer")}</MenuItem>
        </TextField>
        <ExportMenu
          disabled={!data}
          build={() => ({
            title: `${shop} — Sales Register (by ${group})`,
            subtitle: periodText(range),
            filename: `sales-${group}-${range.from}-${range.to}`,
            sections: [sec(`Sales by ${group}`, cols, data.data, true)],
          })}
        />
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      {data?.truncated && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t("Showing the top {n} by sales. Totals include everything.", { n: data.data.length })}
        </Alert>
      )}
      {!data ? <Loader /> : <ReportTable cols={cols} rows={data.data} totals={data.totals} />}
    </>
  );
}

function GstSummary({ range, shop }) {
  const t = useT();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setData(null);
    ReportServices.gstSummary(range).then(setData).catch((e) => setError(apiError(e)));
  }, [range]);
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Loader />;
  const tot = data.totals;
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
  const b2cCols = [{ key: "place_of_supply", label: "Place of Supply" }, { key: "gst_rate", label: "Rate %", align: "right", type: "number" }, ...taxCols];
  const hsnCols = [
    { key: "hsn_code", label: "HSN/SAC" },
    { key: "description", label: "Description" },
    { key: "unit", label: "UQC" },
    { key: "quantity", label: "Qty", align: "right", type: "qty", format: (v) => formatNumber(v, 3) },
    { key: "gst_rate", label: "Rate %", align: "right", type: "number" },
    { key: "total_amount", label: "Total Value", money: true },
    ...taxCols,
  ];
  const sum = (rows, cols) => Object.fromEntries(cols.filter((c) => c.money).map((c) => [c.key, rows.reduce((s, r) => s + Number(r[c.key] || 0), 0)]));
  const rateCols = [{ key: "gst_rate", label: "GST Rate %", type: "number" }, ...taxCols];
  const Section = ({ title, cols, rows }) => (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      <ReportTable cols={cols} rows={rows} totals={sum(rows, cols)} />
    </Box>
  );
  const build = () => ({
    title: `${shop} — GST Summary`,
    subtitle: periodText(range),
    filename: `gst-summary-${range.from}-${range.to}`,
    sections: [
      {
        heading: "Summary",
        summary: [
          { label: "Taxable turnover", value: tot.taxable_value, type: "money" },
          { label: "CGST", value: tot.cgst_amount, type: "money" },
          { label: "SGST", value: tot.sgst_amount, type: "money" },
          { label: "IGST", value: tot.igst_amount, type: "money" },
          { label: "Output GST", value: tot.tax_amount, type: "money" },
          { label: "Input tax credit (expenses)", value: data.input_tax_credit, type: "money" },
          { label: "Estimated GST payable", value: data.net_gst_payable, type: "money" },
          { label: "Invoices", value: tot.invoices, type: "number" },
        ],
      },
      sec("Rate-wise summary", rateCols, data.by_rate, true),
      { ...sec("GSTR-1 B2B", b2bCols, data.b2b, true), sheet: "B2B" },
      { ...sec("GSTR-1 B2C", b2cCols, data.b2c, true), sheet: "B2C" },
      { ...sec("HSN summary", hsnCols, data.hsn, true), sheet: "HSN" },
    ],
  });
  return (
    <>
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label={t("Taxable turnover")} value={formatCurrency(tot.taxable_value)} hint={`${tot.invoices} invoices · ${tot.cancelled_invoices} cancelled`} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label={t("Output GST")} value={formatCurrency(tot.tax_amount)} hint={`CGST ${formatCompact(tot.cgst_amount)} · SGST ${formatCompact(tot.sgst_amount)} · IGST ${formatCompact(tot.igst_amount)}`} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label={t("Input tax credit (expenses)")} value={formatCurrency(data.input_tax_credit)} color="success.main" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label={t("Estimated GST payable")} value={formatCurrency(data.net_gst_payable)} color="error.main" />
        </Grid>
      </Grid>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
        <ExportMenu build={build} label={t("Download GST report")} />
      </Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        {t("Use these tables to fill GSTR-1 (B2B, B2C, HSN) and GSTR-3B. Please verify with your CA before filing.")}
      </Alert>
      <Section title={t("Rate-wise summary")} cols={rateCols} rows={data.by_rate} />
      <Section title={t("B2B invoices (registered buyers)")} cols={b2bCols} rows={data.b2b} />
      <Section title={t("B2C summary (unregistered buyers)")} cols={b2cCols} rows={data.b2c} />
      <Section title={t("HSN-wise summary")} cols={hsnCols} rows={data.hsn} />
    </>
  );
}

export default function Reports() {
  const t = useT();
  const { user } = useAuth();
  const shop = user?.store_name || "Business";
  const [tab, setTab] = useState("pl");
  const [range, setRange] = useState(() => {
    const p = datePresets().find((x) => x.key === "month");
    return { from: p.from, to: p.to };
  });
  return (
    <>
      <PageHeader title={t("Reports")} actions={tab === "annual" ? null : <DateRangeFilter value={range} onChange={setRange} />} />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ mb: 2 }}>
        <Tab value="pl" label={t("Profit & Loss")} />
        <Tab value="sales" label={t("Sales Register")} />
        <Tab value="gst" label={t("GST Summary")} />
        <Tab value="annual" label={t("Annual Report")} />
      </Tabs>
      {tab === "pl" && <ProfitLoss range={range} shop={shop} />}
      {tab === "sales" && <SalesRegister range={range} shop={shop} />}
      {tab === "gst" && <GstSummary range={range} shop={shop} />}
      {tab === "annual" && <AnnualReport />}
    </>
  );
}
