import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import AddIcon from "@mui/icons-material/Add";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import SavingsIcon from "@mui/icons-material/Savings";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import PaymentsIcon from "@mui/icons-material/Payments";
import ReceiptIcon from "@mui/icons-material/Receipt";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import StatusChip from "../../components/common/StatusChip";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import { ReportServices } from "../../services/ReportServices";
import { useAuth } from "../../context/useAuth";
import { apiError, datePresets, formatCompact, formatCurrency, formatDate, formatNumber } from "../../utils/format";

const COLORS = ["#045864", "#00897b", "#f9a825", "#ef6c00", "#6a1b9a", "#1565c0", "#c62828", "#546e7a"];

const ChartCard = ({ title, children, height = 260, action }) => (
  <Paper sx={{ p: { xs: 1.5, sm: 2 }, height: "100%" }}>
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {action}
    </Box>
    <Box sx={{ height }}>{children}</Box>
  </Paper>
);

const Empty = ({ text = "No data yet" }) => (
  <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "text.secondary" }}>
    <Typography variant="body2">{text}</Typography>
  </Box>
);

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [range, setRange] = useState(() => {
    const p = datePresets().find((x) => x.key === "month");
    return { from: p.from, to: p.to };
  });
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setError("");
    ReportServices.dashboard(range)
      .then((res) => active && setData(res))
      .catch((err) => active && setError(apiError(err)));
    return () => {
      active = false;
    };
  }, [range]);

  const k = data?.kpis;
  const loading = !data;
  const monthly = (data?.monthly || []).map((m) => ({
    ...m,
    label: new Date(`${m.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short" }),
  }));
  const daily = (data?.daily || []).map((d) => ({ ...d, label: formatDate(d.date).slice(0, 6) }));

  return (
    <>
      <PageHeader
        title={`Hello${user?.name ? `, ${user.name.split(" ")[0]}` : ""} 👋`}
        subtitle={user?.store_name}
        actions={
          <>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => navigate("/order")}>
              New Order
            </Button>
            <Button variant="contained" startIcon={<PointOfSaleIcon />} onClick={() => navigate("/invoices/new")}>
              Quick Bill
            </Button>
          </>
        }
      />
      <Box sx={{ mb: 2 }}>
        <DateRangeFilter value={range} onChange={setRange} />
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, md: 4, xl: 2 }}>
          <StatCard label="Sales" value={formatCurrency(k?.total_sales)} hint={k && `${k.invoice_count} bills · avg ${formatCompact(k.average_bill)}`} icon={<TrendingUpIcon />} loading={loading} onClick={() => navigate("/invoices")} />
        </Grid>
        <Grid size={{ xs: 6, md: 4, xl: 2 }}>
          <StatCard label="Received" value={formatCurrency(k?.collected)} color="success.main" icon={<PaymentsIcon />} loading={loading} onClick={() => navigate("/payments")} />
        </Grid>
        <Grid size={{ xs: 6, md: 4, xl: 2 }}>
          <StatCard label="Expenses" value={formatCurrency(k?.expenses)} color="error.main" icon={<AccountBalanceWalletIcon />} loading={loading} onClick={() => navigate("/expenses")} />
        </Grid>
        <Grid size={{ xs: 6, md: 4, xl: 2 }}>
          <StatCard
            label="Net Profit"
            value={formatCurrency(k?.net_profit)}
            color={k && k.net_profit < 0 ? "error.main" : "success.dark"}
            hint="Sales (excl. GST) − expenses"
            icon={<SavingsIcon />}
            loading={loading}
            onClick={() => navigate("/reports")}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4, xl: 2 }}>
          <StatCard label="Outstanding" value={formatCurrency(k?.outstanding)} hint={k && `${k.due_invoices} unpaid bills`} color="warning.dark" icon={<HourglassBottomIcon />} loading={loading} onClick={() => navigate("/invoices")} />
        </Grid>
        <Grid size={{ xs: 6, md: 4, xl: 2 }}>
          <StatCard label="GST collected" value={formatCurrency(k?.tax_collected)} color="secondary.main" icon={<ReceiptIcon />} loading={loading} onClick={() => navigate("/reports")} />
        </Grid>
      </Grid>

      {data && (data.counts.open_orders > 0 || data.counts.low_stock > 0 || k.overdue > 0) && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
          {data.counts.open_orders > 0 && (
            <Alert severity="info" sx={{ flex: "1 1 220px", cursor: "pointer" }} onClick={() => navigate("/orders")}>
              {data.counts.open_orders} open order(s) waiting to be billed
            </Alert>
          )}
          {k.overdue > 0 && (
            <Alert severity="error" sx={{ flex: "1 1 220px", cursor: "pointer" }} onClick={() => navigate("/invoices")}>
              {formatCurrency(k.overdue)} overdue from customers
            </Alert>
          )}
          {data.counts.low_stock > 0 && (
            <Alert severity="warning" sx={{ flex: "1 1 220px", cursor: "pointer" }} onClick={() => navigate("/inventory")}>
              {data.counts.low_stock} product(s) low on stock
            </Alert>
          )}
        </Box>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ChartCard title="Sales vs Expenses (12 months)">
            {monthly.length ? (
              <ResponsiveContainer>
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis tickFormatter={formatCompact} fontSize={12} width={56} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="sales" name="Sales" fill="#045864" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Received" fill="#26a69a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef6c00" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <ChartCard title="Payment modes">
            {data?.payment_methods?.length ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.payment_methods} dataKey="amount" nameKey="payment_method" innerRadius="50%" outerRadius="80%" paddingAngle={2}>
                    {data.payment_methods.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty text="No payments in this period" />
            )}
          </ChartCard>
        </Grid>
        {daily.length > 0 && (
          <Grid size={{ xs: 12, sm: 6, lg: 8 }}>
            <ChartCard title="Daily sales">
              <ResponsiveContainer>
                <AreaChart data={daily}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#045864" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#045864" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" fontSize={11} minTickGap={16} />
                  <YAxis tickFormatter={formatCompact} fontSize={12} width={56} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Area dataKey="sales" name="Sales" stroke="#045864" fill="url(#salesFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
        )}
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Top products
            </Typography>
            {data?.top_products?.length ? (
              data.top_products.map((p, i) => (
                <Box key={p.name + i} sx={{ display: "flex", justifyContent: "space-between", py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                      {p.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatNumber(p.quantity, 3)} sold
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatCurrency(p.revenue)}
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No sales in this period
              </Typography>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Recent invoices
              </Typography>
              <Button size="small" onClick={() => navigate("/invoices")}>
                View all
              </Button>
            </Box>
            <List dense disablePadding>
              {(data?.recent_invoices || []).map((inv) => (
                <ListItemButton key={inv.invoice_id} onClick={() => navigate(`/invoices/${inv.invoice_id}`)} sx={{ borderRadius: 2, px: 1 }}>
                  <ListItemText
                    primary={`${inv.invoice_number} · ${inv.customer_name || "Walk-in"}`}
                    secondary={formatDate(inv.invoice_date)}
                    slotProps={{ primary: { noWrap: true, fontWeight: 600 } }}
                  />
                  <Box sx={{ textAlign: "right", ml: 1, flexShrink: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {formatCurrency(inv.total_amount)}
                    </Typography>
                    <StatusChip status={inv.status} />
                  </Box>
                </ListItemButton>
              ))}
              {data && !data.recent_invoices.length && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  No invoices yet — create your first Quick Bill.
                </Typography>
              )}
            </List>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Top customers
            </Typography>
            {(data?.top_customers || []).map((c, i) => (
              <Box key={c.name + i} sx={{ display: "flex", justifyContent: "space-between", py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600, minWidth: 0 }}>
                  {c.name}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, ml: 1 }}>
                  {formatCurrency(c.amount)}
                </Typography>
              </Box>
            ))}
            {data && !data.top_customers.length && (
              <Typography variant="body2" color="text.secondary">
                No sales in this period
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}
