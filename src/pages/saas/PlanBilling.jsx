import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Chip, Grid, LinearProgress, Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/CheckCircle";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import useCheckout from "../../components/saas/useCheckout";
import { loadPlanStatus } from "../../components/saas/planStatus";
import { PlanServices } from "../../services/SaasServices";
import { useAuth } from "../../context/useAuth";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { formatDate } from "../../utils/format";
import { rupees } from "../../components/saas/saasUtils";

const STATUS = { trial: ["Free trial", "info"], active: ["Active", "success"], grace: ["Grace period", "warning"], expired: ["Expired", "error"], suspended: ["On hold", "error"] };

/** Settings > Plan & billing (SaaS): this shop's Khanak plan, usage, renew / upgrade and invoices. */
export default function PlanBilling() {
  const t = useT();
  const notify = useNotify();
  const { isAdmin } = useAuth();
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  const [cycle, setCycle] = useState("year");
  const [busy, setBusy] = useState("");
  const { pay, dialog } = useCheckout(PlanServices.mockPay);

  const load = (force) =>
    loadPlanStatus(force).then((p) => {
      if (!p) setError(t("Plan details could not be loaded."));
      setPlan(p);
      if (p?.billing_cycle) setCycle(p.billing_cycle);
    });
  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!plan) return <Loader />;

  const [statusLabel, statusColor] = STATUS[plan.status] || [plan.status, "default"];
  const cur = plan.plan || {};
  const buy = async (code) => {
    setBusy(code);
    try {
      const r = await PlanServices.createOrder({ plan: code, cycle, stores: plan.store_quota });
      const paid = await pay(r.order);
      const v = await PlanServices.verifyPayment(paid);
      notify(v.message || t("Payment received"));
      await load(true);
    } catch (e) {
      if (e.message !== "cancelled") notify(e.response?.data?.message || e.message, "error");
    }
    setBusy("");
  };
  const usage = (used, max) => (max ? Math.min(100, (used / max) * 100) : 0);

  return (
    <>
      <PageHeader title="Plan & billing" subtitle={`${t("Shop code")}: ${plan.shop_code}`} />
      <Grid container spacing={2} data-tour="screen-main">
        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent sx={{ display: "grid", gap: 1.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {cur.name}
                </Typography>
                <Chip color={statusColor} label={t(statusLabel)} />
              </Box>
              <Typography color="text.secondary">
                {plan.status === "trial" ? t("Trial ends") : t("Valid till")}: <b>{formatDate(plan.valid_till)}</b>
                {plan.days_left !== null && plan.days_left >= 0 ? ` · ${t("{n} days left", { n: plan.days_left })}` : ""}
              </Typography>
              <Box>
                <Typography variant="body2">
                  {t("Users")}: {plan.usage.users} / {cur.max_users || "∞"}
                </Typography>
                <LinearProgress variant="determinate" value={usage(plan.usage.users, cur.max_users)} sx={{ height: 8, borderRadius: 4, mt: 0.5 }} />
              </Box>
              <Box>
                <Typography variant="body2">
                  {t("Stores")}: {plan.usage.stores} / {cur.per_store ? plan.store_quota : cur.max_stores || "∞"}
                </Typography>
                <LinearProgress variant="determinate" value={usage(plan.usage.stores, cur.per_store ? plan.store_quota : cur.max_stores)} sx={{ height: 8, borderRadius: 4, mt: 0.5 }} />
              </Box>
              {plan.status === "expired" && <Alert severity="error">{t("Saving is paused until you renew. Your data is safe.")}</Alert>}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          {!isAdmin ? (
            <Alert severity="info">{t("Ask the shop owner (Admin) to renew or change the plan.")}</Alert>
          ) : (
            <Card variant="outlined">
              <CardContent sx={{ display: "grid", gap: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {plan.status === "trial" ? t("Choose your plan") : t("Renew or upgrade")}
                  </Typography>
                  <ToggleButtonGroup exclusive size="small" value={cycle} onChange={(_, v) => v && setCycle(v)}>
                    <ToggleButton value="year">{t("Yearly")}</ToggleButton>
                    <ToggleButton value="month">{t("Monthly")}</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                <Grid container spacing={1.5}>
                  {(plan.plans || []).map((p) => {
                    const unit = cycle === "month" ? p.price_month : p.price_year;
                    const amount = unit * (p.per_store ? Math.max(1, plan.store_quota) : 1);
                    const isCur = p.code === cur.code;
                    return (
                      <Grid key={p.code} size={{ xs: 12, sm: 6 }}>
                        <Box sx={{ border: 1, borderColor: isCur ? "secondary.main" : "divider", borderRadius: 2, p: 1.5, display: "grid", gap: 0.75, height: "100%" }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                            <b>{p.name}</b>
                            {isCur && <Chip size="small" label={t("Current")} />}
                          </Box>
                          <Typography variant="body2">
                            {unit ? (
                              <>
                                <b>{rupees(amount)}</b> + GST / {cycle === "month" ? t("month") : t("year")}
                              </>
                            ) : (
                              t("Yearly only")
                            )}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {p.max_users || "∞"} {t(p.max_users === 1 ? "user" : "users")} · {p.per_store ? t("per store") : `${p.max_stores || "∞"} ${t(p.max_stores === 1 ? "store" : "stores")}`} · {p.features.length} {t("modules")}
                          </Typography>
                          <Button size="small" variant={isCur ? "contained" : "outlined"} color="secondary" disabled={!unit || Boolean(busy)} onClick={() => buy(p.code)}>
                            {busy === p.code ? t("Paying…") : isCur ? (plan.status === "trial" ? t("Pay for {p}", { p: p.name }) : t("Renew")) : t("Switch to {p}", { p: p.name })}
                          </Button>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
                <Typography variant="caption" color="text.secondary">
                  {t("Renewing the same plan adds the time after your current end date. A new plan starts today.")}{" "}
                  {plan.payment_mode === "mock" ? t("Test mode: no real money is taken.") : ""}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
        <Grid size={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {t("Your plan includes")}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {(cur.features || []).map((f) => (
                  <Chip key={f} icon={<CheckIcon />} label={t((plan.features || {})[f] || f)} variant="outlined" color="success" />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        {isAdmin && (
          <Grid size={12}>
            <TableContainer component={Card} variant="outlined">
              <Typography variant="h6" sx={{ fontWeight: 700, p: 2, pb: 0 }}>
                {t("Payments & GST invoices")}
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t("Invoice")}</TableCell>
                    <TableCell>{t("Date")}</TableCell>
                    <TableCell align="right">{t("Amount")}</TableCell>
                    <TableCell align="right">{t("GST")}</TableCell>
                    <TableCell align="right">{t("Total")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(plan.invoices || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ color: "text.secondary" }}>
                        {t("No payments yet.")}
                      </TableCell>
                    </TableRow>
                  )}
                  {(plan.invoices || []).map((i) => (
                    <TableRow key={i.invoice_no}>
                      <TableCell>
                        <Link href={i.url} target="_blank" rel="noopener">
                          {i.invoice_no}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(i.created_at)}</TableCell>
                      <TableCell align="right">{rupees(i.amount)}</TableCell>
                      <TableCell align="right">{rupees(i.gst)}</TableCell>
                      <TableCell align="right">
                        <b>{rupees(i.total)}</b>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        )}
      </Grid>
      {dialog}
    </>
  );
}
