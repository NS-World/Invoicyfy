import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Divider, FormControlLabel, Grid, InputAdornment, MenuItem, Switch, TextField,
  ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Cancel";
import PublicShell from "./PublicShell";
import { rupees, WELCOME_KEY } from "../../components/saas/saasUtils";
import Loader from "../../components/common/Loader";
import useCheckout from "../../components/saas/useCheckout";
import { SaasServices } from "../../services/SaasServices";
import useSaasConfig from "../../hooks/useSaasConfig";
import { useT } from "../../context/PrefsContext";


const blank = { business_name: "", owner_name: "", phone: "", email: "", city: "", gstin: "", shop_code: "" };

/** Sign-up: shop details, plan, then a free trial or payment. The login details come back at the end. */
export default function Signup() {
  const t = useT();
  const cfg = useSaasConfig();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [plans, setPlans] = useState(null);
  const [form, setForm] = useState(blank);
  const [plan, setPlan] = useState(params.get("plan") || "growth");
  const [cycle, setCycle] = useState(params.get("cycle") === "month" ? "month" : "year");
  const [stores, setStores] = useState(1);
  const [trial, setTrial] = useState(params.get("trial") === "1");
  const [code, setCode] = useState({ state: "idle" }); // idle | checking | ok | taken | bad
  const [codeTouched, setCodeTouched] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const { pay, dialog } = useCheckout(SaasServices.mockPay);
  const timer = useRef(null);

  useEffect(() => {
    SaasServices.plans().then((r) => setPlans(r.data)).catch(() => setError(t("Plans could not be loaded. Please refresh.")));
  }, [t]);

  const p = useMemo(() => plans?.find((x) => x.code === plan) || null, [plans, plan]);
  const trialDays = cfg?.trial_days ?? 14;
  const canTrial = trialDays > 0 && p && !p.per_store;
  const isTrial = trial && canTrial;
  const unit = p ? (cycle === "month" ? p.price_month : p.price_year) : 0;
  const amount = unit * (p?.per_store ? Math.max(1, stores) : 1);
  const gst = Math.round((amount * (cfg?.gst_rate ?? 18)) / 100);

  useEffect(() => {
    if (p && !p.price_month && cycle === "month") setCycle("year");
  }, [p, cycle]);

  // Shop code: suggested from the business name until typed by hand; checked as it changes.
  const checkCode = (value, fromName) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        if (fromName) {
          if (!value.trim()) return;
          const r = await SaasServices.suggestCode(value);
          setForm((f) => ({ ...f, shop_code: r.code }));
          setCode({ state: "ok" });
        } else {
          if (!value) return setCode({ state: "idle" });
          setCode({ state: "checking" });
          const r = await SaasServices.checkCode(value);
          setCode({ state: !r.valid ? "bad" : r.available ? "ok" : "taken" });
        }
      } catch {
        setCode({ state: "idle" });
      }
    }, 450);
  };
  const set = (k) => (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    if (k === "business_name" && !codeTouched) checkCode(v, true);
  };

  const finish = (creds) => {
    try {
      sessionStorage.setItem(WELCOME_KEY, JSON.stringify(creds));
    } catch {
      /* storage blocked: the welcome screen still gets the details from navigation state */
    }
    navigate("/welcome", { replace: true, state: { credentials: creds } });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (code.state === "taken" || code.state === "bad") {
      setError(t("Choose another shop code"));
      return;
    }
    setBusy(isTrial ? t("Setting up your shop…") : t("Starting payment…"));
    try {
      const r = await SaasServices.signup({ ...form, plan, cycle, stores, trial: isTrial });
      if (r.credentials) return finish(r.credentials);
      const order = r.order;
      setBusy(t("Waiting for payment…"));
      let paid;
      try {
        paid = await pay(order);
      } catch (err) {
        setBusy("");
        if (err.message !== "cancelled") setError(err.message);
        else setError(t("Payment window closed. Your details are kept — press the button again to pay."));
        return;
      }
      setBusy(t("Payment received. Setting up your shop…"));
      let creds = null;
      for (let i = 0; i < 15 && !creds; i++) {
        try {
          const v = await SaasServices.verifyPayment(paid);
          creds = v.credentials;
          if (!creds) break;
        } catch (err) {
          if (err.response?.data?.code !== "processing") throw err;
          await new Promise((res) => setTimeout(res, 2000));
          const s = await SaasServices.orderStatus(order.order_id, form.email).catch(() => null);
          if (s?.credentials) creds = s.credentials;
        }
      }
      if (creds) return finish(creds);
      setBusy("");
      setError(t("Payment received. Your login details are being emailed to {email}.", { email: form.email }));
    } catch (err) {
      setBusy("");
      setError(err.response?.data?.message || err.message || t("Something went wrong. Please try again."));
    }
  };

  if (!plans && !error) return <Loader />;

  return (
    <PublicShell maxWidth="md">
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
        {isTrial ? t("Start your free trial") : t("Get Khanak for your shop")}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {t("Fill in your shop details. Your login is ready in about a minute.")}
      </Typography>
      {error && (
        <Alert severity={error.startsWith(t("Payment received")) ? "success" : "error"} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Grid container spacing={3} component="form" onSubmit={submit} data-tour="signup-form">
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined">
            <CardContent sx={{ display: "grid", gap: 2 }}>
              <TextField required label={t("Shop / business name")} value={form.business_name} onChange={set("business_name")} inputProps={{ maxLength: 150 }} />
              <TextField required label={t("Owner name")} value={form.owner_name} onChange={set("owner_name")} inputProps={{ maxLength: 120 }} />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth required label={t("Mobile")} type="tel" value={form.phone} onChange={set("phone")} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth required label={t("Email")} type="email" value={form.email} onChange={set("email")} helperText={t("Login details are sent here")} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth label={t("City")} value={form.city} onChange={set("city")} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth label={t("GSTIN (optional)")} value={form.gstin} onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))} inputProps={{ maxLength: 15 }} />
                </Grid>
              </Grid>
              <TextField
                required
                label={t("Shop code")}
                value={form.shop_code}
                onChange={(e) => {
                  const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30);
                  setCodeTouched(true);
                  setForm((f) => ({ ...f, shop_code: v }));
                  checkCode(v, false);
                }}
                helperText={
                  code.state === "taken" ? t("Already taken — try another") : code.state === "bad" ? t("3–30 small letters, numbers or -") : t("Used at every login, e.g. scoopiez-surat")
                }
                error={code.state === "taken" || code.state === "bad"}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      {code.state === "checking" && <CircularProgress size={16} />}
                      {code.state === "ok" && <CheckIcon color="success" fontSize="small" />}
                      {(code.state === "taken" || code.state === "bad") && <ErrorIcon color="error" fontSize="small" />}
                    </InputAdornment>
                  ),
                }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined" sx={{ position: { md: "sticky" }, top: 16 }}>
            <CardContent sx={{ display: "grid", gap: 2 }}>
              <TextField select label={t("Plan")} value={plan} onChange={(e) => setPlan(e.target.value)}>
                {(plans || []).map((x) => (
                  <MenuItem key={x.code} value={x.code}>
                    {x.name} — {t(x.tagline)}
                  </MenuItem>
                ))}
              </TextField>
              {canTrial && <FormControlLabel control={<Switch checked={trial} onChange={(e) => setTrial(e.target.checked)} />} label={t("Free trial for {n} days first", { n: trialDays })} />}
              {!isTrial && (
                <ToggleButtonGroup exclusive fullWidth size="small" value={cycle} onChange={(_, v) => v && setCycle(v)}>
                  <ToggleButton value="year">{t("Yearly")}</ToggleButton>
                  <ToggleButton value="month" disabled={!p?.price_month}>
                    {t("Monthly")}
                  </ToggleButton>
                </ToggleButtonGroup>
              )}
              {p?.per_store && !isTrial && (
                <TextField type="number" label={t("Number of stores")} value={stores} onChange={(e) => setStores(Math.max(1, Math.min(500, Number(e.target.value) || 1)))} />
              )}
              <Divider />
              {isTrial ? (
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    {t("Free for {n} days", { n: trialDays })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("No payment now. Choose to pay before the trial ends to keep billing.")}
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: "grid", gap: 0.5, fontVariantNumeric: "tabular-nums" }}>
                  <Row label={`${p?.name || ""} · ${cycle === "month" ? t("1 month") : t("1 year")}${p?.per_store ? ` × ${stores}` : ""}`} value={rupees(amount)} />
                  <Row label={t("GST {r}%", { r: cfg?.gst_rate ?? 18 })} value={rupees(gst)} />
                  <Divider sx={{ my: 0.5 }} />
                  <Row label={<b>{t("Total")}</b>} value={<b>{rupees(amount + gst)}</b>} big />
                </Box>
              )}
              <Button type="submit" variant="contained" color="secondary" size="large" disabled={Boolean(busy)}>
                {busy ? (
                  <>
                    <CircularProgress size={18} sx={{ mr: 1 }} color="inherit" /> {busy}
                  </>
                ) : isTrial ? (
                  t("Start free trial")
                ) : (
                  t("Pay {amt} and start", { amt: rupees(amount + gst) })
                )}
              </Button>
              <Typography variant="caption" color="text.secondary">
                {cfg?.payment_mode === "mock" ? t("Test mode: no real money is taken.") : t("Secure payment by Razorpay: UPI, cards, net banking.")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {dialog}
    </PublicShell>
  );
}

function Row({ label, value, big }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, fontSize: big ? 18 : 14 }}>
      <span>{label}</span>
      <span>{value}</span>
    </Box>
  );
}
