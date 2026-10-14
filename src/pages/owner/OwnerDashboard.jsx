import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Chip, Grid, IconButton, Paper, Skeleton, Tooltip, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { useNavigate } from "react-router-dom";
import StorePicker from "../../components/v3/StorePicker";
import useStoreId from "../../hooks/useStoreId";
import { V4ReportServices } from "../../services/V4Services";
import { useAuth } from "../../context/useAuth";
import { useT } from "../../context/PrefsContext";
import { apiError, formatCurrency, formatDate, formatTime } from "../../utils/format";

function Change({ now, before, label }) {
  const t = useT();
  if (!before) return <Typography variant="caption" color="text.secondary">{`${t(label)}: —`}</Typography>;
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct >= 0;
  return (
    <Typography variant="caption" sx={{ color: up ? "success.main" : "error.main", display: "inline-flex", alignItems: "center", gap: 0.25 }}>
      {up ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />}
      {up ? "+" : ""}
      {pct}% {t(label)}
    </Typography>
  );
}

function Tile({ title, value, sub, color, onClick }) {
  const t = useT();
  return (
    <Paper variant="outlined" onClick={onClick} sx={{ p: 1.5, height: "100%", cursor: onClick ? "pointer" : "default", borderRadius: 3 }}>
      <Typography variant="caption" color="text.secondary">
        {t(title)}
      </Typography>
      <Typography sx={{ fontWeight: 800, fontSize: 20, color: color || "text.primary", lineHeight: 1.3 }}>{value}</Typography>
      {sub}
    </Paper>
  );
}

/** One look on the phone: today's sales, cash, top items and what needs attention. Refreshes every minute. */
export default function OwnerDashboard() {
  const t = useT();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [storeId, setStoreId] = useStoreId();
  const [d, setD] = useState(null);
  const [at, setAt] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    V4ReportServices.owner({ store_id: storeId || undefined })
      .then((r) => {
        setD(r.data);
        setAt(r.generated_at);
        setError("");
      })
      .catch((e) => setError(apiError(e)));
  }, [storeId]);
  useEffect(() => {
    load();
    const timer = setInterval(() => document.visibilityState === "visible" && load(), 60000);
    return () => clearInterval(timer);
  }, [load]);

  const maxHour = d ? Math.max(1, ...d.hourly) : 1;
  const firstHour = d ? Math.max(0, d.hourly.findIndex((v) => v > 0) - 1) : 0;
  const lastHour = d ? Math.min(23, Math.max(new Date().getHours(), 23 - [...d.hourly].reverse().findIndex((v) => v > 0))) : 23;
  const a = d?.attention;

  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {t("Today at a glance")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {at ? `${t("Updated")} ${formatTime(at)}` : " "}
          </Typography>
        </Box>
        <StorePicker value={storeId} onChange={setStoreId} />
        <Tooltip title={t("Refresh")}>
          <IconButton onClick={load}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!d ? (
        <Skeleton variant="rounded" height={420} />
      ) : (
        <>
          <Paper sx={{ p: 2.5, mb: 1.5, borderRadius: 3, color: "#fff", background: "linear-gradient(135deg, #045864 0%, #0b7285 60%, #1a1d21 100%)" }}>
            <Typography sx={{ opacity: 0.8, fontSize: 13 }}>{t("Sales today")}</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 36, lineHeight: 1.15 }}>{formatCurrency(d.today.sales)}</Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 0.5, fontSize: 13, opacity: 0.9 }}>
              <span>
                {d.today.bills} {t("bills")}
              </span>
              <span>
                {t("Avg bill")} {formatCurrency(d.today.avg_bill)}
              </span>
              <span>
                {t("Gross profit")} {formatCurrency(d.today.gross_profit)}
              </span>
            </Box>
            <Box sx={{ display: "flex", gap: 2, mt: 1, flexWrap: "wrap", "& .MuiTypography-root": { color: "#fff !important", opacity: 0.95 } }}>
              <Change now={d.today.sales} before={d.yesterday.sales} label="vs yesterday" />
              <Change now={d.today.sales} before={d.last_week.sales} label="vs same day last week" />
            </Box>
          </Paper>

          <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
            <Grid size={6}>
              <Tile title="This month" value={formatCurrency(d.month.sales)} sub={<Change now={d.month.sales} before={d.month.last_month_same_days} label="vs last month" />} />
            </Grid>
            <Grid size={6}>
              <Tile
                title="Cash in drawer"
                value={d.cash_in_drawer.length ? formatCurrency(d.cash_in_drawer.reduce((s, c) => s + c.expected_cash, 0)) : "—"}
                sub={
                  <Typography variant="caption" color="text.secondary">
                    {d.cash_in_drawer.length ? `${t("Day opened")} ${String(d.cash_in_drawer[0].opened_at).slice(0, 10) === at?.slice(0, 10) ? "" : `${formatDate(d.cash_in_drawer[0].opened_at, "short")} `}${formatTime(d.cash_in_drawer[0].opened_at)}` : t("Day not opened")}
                  </Typography>
                }
                onClick={can("cash") ? () => navigate("/day-close") : undefined}
              />
            </Grid>
          </Grid>

          <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
              {t("Money received today")}
            </Typography>
            {d.by_method.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                {t("Nothing yet")}
              </Typography>
            )}
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {d.by_method.map((m) => (
                <Chip key={m.method} label={`${t(m.method)}: ${formatCurrency(m.amount)}`} />
              ))}
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
              {t("Sales by hour")}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "flex-end", gap: "3px", height: 90 }}>
              {d.hourly.slice(firstHour, lastHour + 1).map((v, i) => (
                <Tooltip key={i} title={`${firstHour + i}:00 · ${formatCurrency(v)}`}>
                  <Box sx={{ flex: 1, minWidth: 6, height: `${Math.max(2, (v / maxHour) * 100)}%`, bgcolor: v ? "primary.main" : "action.hover", borderRadius: "3px 3px 0 0" }} />
                </Tooltip>
              ))}
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">{`${firstHour}:00`}</Typography>
              <Typography variant="caption" color="text.secondary">{`${lastHour}:00`}</Typography>
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
              {t("Top items today")}
            </Typography>
            {d.top_items.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                {t("No sales yet today")}
              </Typography>
            )}
            {d.top_items.map((it, i) => (
              <Box key={it.name} sx={{ display: "flex", gap: 1, py: 0.5, borderTop: i ? 1 : 0, borderColor: "divider" }}>
                <Typography variant="body2" sx={{ width: 18, color: "text.secondary" }}>
                  {i + 1}
                </Typography>
                <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
                  {it.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {Number(it.qty.toFixed(3))} {it.unit}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 80, textAlign: "right" }}>
                  {formatCurrency(it.amount)}
                </Typography>
              </Box>
            ))}
          </Paper>

          <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
            {t("Needs attention")}
          </Typography>
          <Grid container spacing={1.5}>
            <Grid size={6}>
              <Tile title="Udhaar to collect" value={formatCurrency(a.dues.amount)} color={a.dues.amount > 0 ? "error.main" : undefined} sub={<Typography variant="caption" color="text.secondary">{`${a.dues.customers} ${t("customers")}`}</Typography>} onClick={can("payments") ? () => navigate("/credit") : undefined} />
            </Grid>
            <Grid size={6}>
              <Tile title="Low stock items" value={a.low_stock} color={a.low_stock > 0 ? "warning.main" : undefined} onClick={can("inventory") ? () => navigate("/inventory") : undefined} />
            </Grid>
            {a.expiring && (
              <Grid size={6}>
                <Tile
                  title="Expiring soon"
                  value={a.expiring.batches}
                  color={a.expiring.batches > 0 ? "error.main" : undefined}
                  sub={<Typography variant="caption" color="text.secondary">{`${formatCurrency(a.expiring.value)} · ${a.expiring.days} ${t("days")}`}</Typography>}
                  onClick={can("inventory") ? () => navigate("/expiry") : undefined}
                />
              </Grid>
            )}
            {a.supplier_dues !== undefined && (
              <Grid size={6}>
                <Tile title="We owe suppliers" value={formatCurrency(a.supplier_dues)} onClick={can("purchases") ? () => navigate("/suppliers") : undefined} />
              </Grid>
            )}
            {a.online_pending && (
              <Grid size={12}>
                <Tile
                  title="Platform payouts pending"
                  value={formatCurrency(a.online_pending.amount)}
                  sub={<Typography variant="caption" color="text.secondary">{`${a.online_pending.orders} ${t("orders")}`}</Typography>}
                  onClick={() => navigate("/online-orders")}
                />
              </Grid>
            )}
          </Grid>
        </>
      )}
    </Box>
  );
}
