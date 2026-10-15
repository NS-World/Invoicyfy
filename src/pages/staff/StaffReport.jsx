import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Chip, Grid, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import PageHeader from "../../components/common/PageHeader";
import Toolbar from "../../components/common/Toolbar";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import ExportMenu from "../../components/common/ExportMenu";
import StatCard from "../../components/common/StatCard";
import StorePicker from "../../components/v3/StorePicker";
import useStoreId from "../../hooks/useStoreId";
import { V4ReportServices } from "../../services/V4Services";
import { useAuth } from "../../context/useAuth";
import { useT } from "../../context/PrefsContext";
import { apiError, datePresets, formatCurrency, formatDate, formatTime } from "../../utils/format";

/** Per cashier: bills, sales, discounts, cancellations and money collected; plus every cash shift. */
export default function StaffReport() {
  const t = useT();
  const { user } = useAuth();
  const [storeId, setStoreId] = useStoreId();
  const [range, setRange] = useState(() => {
    const p = datePresets().find((x) => x.key === "today") || datePresets()[0];
    return { from: p.from, to: p.to };
  });
  const [d, setD] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    V4ReportServices.staff({ ...range, store_id: storeId || undefined })
      .then((r) => {
        setD(r);
        setError("");
      })
      .catch((e) => setError(apiError(e)));
  }, [range, storeId]);
  useEffect(() => {
    load();
  }, [load]);

  const build = async () => ({
    title: `${user?.store_name || "Business"} — ${t("Staff report")}`,
    subtitle: `${formatDate(range.from)} – ${formatDate(range.to)}`,
    filename: "staff-report",
    sections: [
      {
        heading: t("Staff"),
        rows: d.staff,
        totals: true,
        columns: [
          { label: "Staff", key: "name" },
          { label: "Bills", key: "bills", type: "number", total: true },
          { label: "Sales", key: "sales", type: "money", total: true },
          { label: "Avg bill", key: "avg_bill", type: "money" },
          { label: "Discount", key: "discount", type: "money", total: true },
          { label: "PIN approvals", key: "approvals", type: "number", total: true },
          { label: "Cancelled bills", key: "cancelled_bills", type: "number", total: true },
          { label: "Cancelled ₹", key: "cancelled_amount", type: "money", total: true },
          { label: "Cash", value: (r) => r.by_method.Cash || 0, type: "money", total: true },
          { label: "UPI", value: (r) => r.by_method.UPI || 0, type: "money", total: true },
          { label: "Card", value: (r) => r.by_method.Card || 0, type: "money", total: true },
          { label: "Collected", key: "collected", type: "money", total: true },
        ],
      },
      {
        heading: t("Cash shifts"),
        rows: d.shifts,
        columns: [
          { label: "Opened", key: "opened_at", type: "date" },
          { label: "Opened by", key: "opened_by_name" },
          { label: "Closed", key: "closed_at", type: "date" },
          { label: "Closed by", key: "closed_by_name" },
          { label: "Opening cash", key: "opening_cash", type: "money" },
          { label: "Expected", key: "expected_cash", type: "money" },
          { label: "Counted", key: "counted_cash", type: "money" },
          { label: "Difference", key: "difference", type: "money", total: true },
        ],
      },
    ],
  });

  return (
    <>
      <PageHeader title="Staff report" subtitle="Who billed how much, discounts, cancellations and cash shifts" actions={<StorePicker value={storeId} onChange={setStoreId} />} />
      <Toolbar>
        <DateRangeFilter value={range} onChange={setRange} />
        <ExportMenu build={build} disabled={!d} />
      </Toolbar>
      {error && <Alert severity="error">{error}</Alert>}
      {d && (
        <>
          <Grid container data-tour="screen-main" spacing={1.5} sx={{ mb: 2 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard label="Bills" value={d.totals.bills} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard label="Sales" value={formatCurrency(d.totals.sales)} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard label="Discount given" value={formatCurrency(d.totals.discount)} color="warning.main" />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatCard label="Cash short in shifts" value={formatCurrency(Math.abs(d.totals.cash_short))} color={d.totals.cash_short < 0 ? "error.main" : "success.main"} hint={`${d.totals.cancelled_bills} ${t("bills cancelled")}`} />
            </Grid>
          </Grid>
          <Paper sx={{ overflowX: "auto", mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {["Staff", "Bills", "Sales", "Avg bill", "Discount", "PIN approvals", "Cancelled", "Collected by mode"].map((h) => (
                    <TableCell key={h} align={h === "Staff" || h === "Collected by mode" ? "left" : "right"} sx={{ fontWeight: 700 }}>
                      {t(h)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {d.staff.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>{t("No bills in this period")}</TableCell>
                  </TableRow>
                )}
                {d.staff.map((s) => (
                  <TableRow key={s.user_id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{s.name}</TableCell>
                    <TableCell align="right">{s.bills}</TableCell>
                    <TableCell align="right">{formatCurrency(s.sales)}</TableCell>
                    <TableCell align="right">{formatCurrency(s.avg_bill)}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(s.discount)}
                      {(s.coupon_discount > 0 || s.offer_discount > 0) && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {[s.offer_discount > 0 ? `${t("offers")} ${formatCurrency(s.offer_discount)}` : null, s.coupon_discount > 0 ? `${t("coupons")} ${formatCurrency(s.coupon_discount)}` : null].filter(Boolean).join(" · ")}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">{s.approvals || "—"}</TableCell>
                    <TableCell align="right">
                      {s.cancelled_bills ? <Chip size="small" color="error" variant="outlined" label={`${s.cancelled_bills} · ${formatCurrency(s.cancelled_amount)}`} /> : "—"}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {Object.entries(s.by_method).map(([m, v]) => (
                          <Chip key={m} size="small" label={`${t(m)} ${formatCurrency(v)}`} />
                        ))}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>{t("Cash shifts (day open → close)")}</Typography>
          <Paper sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {["Opened", "Closed", "Opening cash", "Expected", "Counted", "Difference"].map((h) => (
                    <TableCell key={h} align={h === "Opened" || h === "Closed" ? "left" : "right"} sx={{ fontWeight: 700 }}>
                      {t(h)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {d.shifts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>{t("No shifts in this period (Day Close screen)")}</TableCell>
                  </TableRow>
                )}
                {d.shifts.map((s) => (
                  <TableRow key={s.session_id}>
                    <TableCell>
                      {formatDate(s.opened_at)} {formatTime(s.opened_at)}
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        {s.opened_by_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {s.closed_at ? `${formatDate(s.closed_at)} ${formatTime(s.closed_at)}` : <Chip size="small" color="success" label={t("Open")} />}
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        {s.closed_by_name}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{formatCurrency(s.opening_cash)}</TableCell>
                    <TableCell align="right">{s.expected_cash !== null ? formatCurrency(s.expected_cash) : "—"}</TableCell>
                    <TableCell align="right">{s.counted_cash !== null ? formatCurrency(s.counted_cash) : "—"}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: s.difference < 0 ? "error.main" : s.difference > 0 ? "warning.main" : "success.main" }}>
                      {s.difference !== null ? formatCurrency(s.difference) : "—"}
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
