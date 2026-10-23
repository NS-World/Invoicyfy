import { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel, Grid, IconButton, Link,
  MenuItem, Switch, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Tooltip, Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import LogoutIcon from "@mui/icons-material/Logout";
import PublicShell from "../PublicShell";
import BrandMark from "../../../components/app/BrandMark";
import Loader from "../../../components/common/Loader";
import { SaasAdminServices, adminToken } from "../../../services/SaasServices";
import { formatDate } from "../../../utils/format";
import { rupees } from "../../../components/saas/saasUtils";

const STATUS_COLOR = { trial: "info", active: "success", grace: "warning", expired: "error", suspended: "default" };
const errorText = (e) => e?.response?.data?.message || e?.message || "Something went wrong";

/** Khanak super admin: shops, plans, payments and recurring revenue. Separate login (saas/cli/setup.php). */
export default function KhanakAdmin() {
  const [token, setToken] = useState(adminToken.get());
  if (!token) return <AdminLogin onDone={(t) => (adminToken.set(t), setToken(t))} />;
  return (
    <AdminConsole
      onLogout={() => {
        adminToken.set("");
        setToken("");
      }}
    />
  );
}

function AdminLogin({ onDone }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <PublicShell maxWidth="xs">
      <Card variant="outlined" component="form" onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const r = await SaasAdminServices.login(email, password);
          onDone(r.token);
        } catch (err) {
          setError(errorText(err));
        }
        setBusy(false);
      }}>
        <CardContent sx={{ display: "grid", gap: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Khanak admin</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" variant="contained" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        </CardContent>
      </Card>
    </PublicShell>
  );
}

function AdminConsole({ onLogout }) {
  const [tab, setTab] = useState("overview");
  const [error, setError] = useState("");
  const guard = useCallback(
    async (fn) => {
      try {
        setError("");
        return await fn();
      } catch (e) {
        if (e?.response?.status === 401) onLogout();
        setError(errorText(e));
        return null;
      }
    },
    [onLogout]
  );
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Box sx={{ bgcolor: "#0b4f5c", color: "#fff", px: { xs: 2, md: 3 }, py: 1.5, display: "flex", alignItems: "center", gap: 2 }}>
        <BrandMark size={28} />
        <Typography sx={{ flex: 1, opacity: 0.8 }}>Admin</Typography>
        <Tooltip title="Log out">
          <IconButton onClick={onLogout} sx={{ color: "#fff" }} aria-label="Log out"><LogoutIcon /></IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ maxWidth: 1400, mx: "auto", p: { xs: 1.5, md: 3 } }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ mb: 2 }}>
          <Tab value="overview" label="Overview" />
          <Tab value="shops" label="Shops" />
          <Tab value="payments" label="Payments" />
          <Tab value="plans" label="Plans" />
        </Tabs>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {tab === "overview" && <Overview guard={guard} />}
        {tab === "shops" && <Shops guard={guard} />}
        {tab === "payments" && <Payments guard={guard} />}
        {tab === "plans" && <Plans guard={guard} />}
      </Box>
    </Box>
  );
}

function Stat({ label, value, sub }) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </CardContent>
    </Card>
  );
}

function Overview({ guard }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    guard(() => SaasAdminServices.overview()).then((r) => r && setD(r.data));
  }, [guard]);
  if (!d) return <Loader />;
  return (
    <Grid container spacing={2} data-tour="admin-overview">
      <Grid size={{ xs: 6, md: 3 }}><Stat label="Recurring revenue (MRR)" value={rupees(d.mrr)} sub={`${rupees(d.arr)} a year (ARR)`} /></Grid>
      <Grid size={{ xs: 6, md: 3 }}><Stat label="Paying shops" value={d.shops.active + d.shops.grace} sub={`${d.shops.grace} in grace`} /></Grid>
      <Grid size={{ xs: 6, md: 3 }}><Stat label="On free trial" value={d.shops.trial} sub={`${d.this_month.new_trials} new this month`} /></Grid>
      <Grid size={{ xs: 6, md: 3 }}><Stat label="Collected this month" value={rupees(d.this_month.collected)} sub={`${d.this_month.payments} payments`} /></Grid>
      <Grid size={12}>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {Object.entries(d.shops).map(([k, v]) => <Chip key={k} color={STATUS_COLOR[k]} label={`${k}: ${v}`} />)}
          <Chip variant="outlined" label={`total: ${d.total_shops}`} />
        </Box>
      </Grid>
      <Grid size={12}>
        <TableContainer component={Card} variant="outlined">
          <Typography sx={{ fontWeight: 700, p: 2, pb: 0 }}>Latest activity</Typography>
          <Table size="small">
            <TableBody>
              {d.events.map((e) => (
                <TableRow key={e.event_id}>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(e.created_at)}</TableCell>
                  <TableCell><Chip size="small" label={e.type} /></TableCell>
                  <TableCell>{e.slug || "—"}</TableCell>
                  <TableCell>{e.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
    </Grid>
  );
}

function Shops({ guard }) {
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(null);
  const load = useCallback(() => guard(() => SaasAdminServices.tenants(search, status)).then((r) => r && setRows(r.data)), [guard, search, status]);
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);
  return (
    <>
      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <TextField size="small" label="Search shop, email, phone, city" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 260 }} />
        <TextField size="small" select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="">All</MenuItem>
          {Object.keys(STATUS_COLOR).map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        <IconButton onClick={load} aria-label="Refresh"><RefreshIcon /></IconButton>
      </Box>
      {!rows ? <Loader /> : (
        <TableContainer component={Card} variant="outlined" data-tour="admin-shops">
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell>Shop</TableCell><TableCell>Owner</TableCell><TableCell>Plan</TableCell><TableCell>Status</TableCell>
                <TableCell>Valid till</TableCell><TableCell>City</TableCell><TableCell>Joined</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={7} sx={{ color: "text.secondary" }}>No shops yet.</TableCell></TableRow>}
              {rows.map((r) => (
                <TableRow key={r.tenant_id} hover sx={{ cursor: "pointer" }} onClick={() => setOpen(r.tenant_id)}>
                  <TableCell><b>{r.business_name}</b><Typography variant="caption" display="block" color="text.secondary">{r.shop_code}</Typography></TableCell>
                  <TableCell>{r.owner_name}<Typography variant="caption" display="block" color="text.secondary">{r.phone} · {r.email}</Typography></TableCell>
                  <TableCell>{r.plan_name} · {r.billing_cycle}</TableCell>
                  <TableCell><Chip size="small" color={STATUS_COLOR[r.status]} label={r.status} /></TableCell>
                  <TableCell>{formatDate(r.valid_till)}{r.days_left !== null && <Typography variant="caption" display="block" color="text.secondary">{r.days_left} days</Typography>}</TableCell>
                  <TableCell>{r.city || "—"}</TableCell>
                  <TableCell>{formatDate(r.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {open && <ShopDialog id={open} guard={guard} onClose={(changed) => { setOpen(null); if (changed) load(); }} />}
    </>
  );
}

function ShopDialog({ id, guard, onClose }) {
  const [d, setD] = useState(null);
  const [plans, setPlans] = useState([]);
  const [days, setDays] = useState(7);
  const [planCode, setPlanCode] = useState("");
  const [cycle, setCycle] = useState("year");
  const [ref, setRef] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");
  const [changed, setChanged] = useState(false);
  const load = useCallback(() => guard(() => SaasAdminServices.tenant(id)).then((r) => {
    if (!r) return;
    setD(r.data);
    setPlanCode(r.data.plan_code);
    setCycle(r.data.billing_cycle);
    setNotes(r.data.notes || "");
  }), [guard, id]);
  useEffect(() => {
    load();
    guard(() => SaasAdminServices.plans()).then((r) => r && setPlans(r.data));
  }, [guard, load]);
  const act = async (data) => {
    const r = await guard(() => SaasAdminServices.updateTenant({ tenant_id: id, ...data }));
    if (r) {
      setMsg(r.message);
      setChanged(true);
      load();
    }
  };
  return (
    <Dialog open onClose={() => onClose(changed)} maxWidth="md" fullWidth>
      <DialogTitle>{d ? `${d.business_name} · ${d.shop_code}` : "Shop"}</DialogTitle>
      <DialogContent dividers>
        {!d ? <Loader /> : (
          <Box sx={{ display: "grid", gap: 2 }}>
            {msg && <Alert severity="success">{msg}</Alert>}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2"><b>{d.owner_name}</b> · {d.phone}<br />{d.email}<br />{d.city || ""} {d.gstin ? `· GSTIN ${d.gstin}` : ""}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2">
                  <Chip size="small" color={STATUS_COLOR[d.status]} label={d.status} /> {d.plan?.name} · {d.billing_cycle}
                  <br />Valid till <b>{formatDate(d.valid_till)}</b> · database {d.db_name}
                </Typography>
              </Grid>
            </Grid>
            <Divider />
            <Grid container spacing={1.5} alignItems="center">
              <Grid size={{ xs: 12, sm: 4 }}><TextField size="small" fullWidth type="number" label="Add free days" value={days} onChange={(e) => setDays(e.target.value)} /></Grid>
              <Grid size={{ xs: 12, sm: 8 }}><Button variant="outlined" onClick={() => act({ action: "extend", days: Number(days) })}>Add {days} days</Button></Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField size="small" fullWidth select label="Plan" value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
                  {plans.map((p) => <MenuItem key={p.code} value={p.code}>{p.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField size="small" fullWidth select label="Billing" value={cycle} onChange={(e) => setCycle(e.target.value)}>
                  <MenuItem value="year">Yearly</MenuItem><MenuItem value="month">Monthly</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 5 }}><Button variant="outlined" onClick={() => act({ action: "set_plan", plan: planCode, cycle })}>Change plan (no payment)</Button></Grid>
              <Grid size={{ xs: 12, sm: 7 }}><TextField size="small" fullWidth label="Cash / bank payment: receipt or UTR no." value={ref} onChange={(e) => setRef(e.target.value)} /></Grid>
              <Grid size={{ xs: 12, sm: 5 }}><Button variant="contained" color="secondary" disabled={!ref.trim()} onClick={() => act({ action: "offline_payment", plan: planCode, cycle, reference: ref })}>Record payment + invoice</Button></Grid>
              <Grid size={{ xs: 12, sm: 9 }}><TextField size="small" fullWidth label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></Grid>
              <Grid size={{ xs: 12, sm: 3 }}><Button onClick={() => act({ action: "notes", notes })}>Save notes</Button></Grid>
            </Grid>
            <Box>
              {d.status === "suspended"
                ? <Button color="success" variant="outlined" onClick={() => act({ action: "activate" })}>Activate shop</Button>
                : <Button color="error" variant="outlined" onClick={() => act({ action: "suspend" })}>Put shop on hold</Button>}
            </Box>
            <Divider />
            <Typography sx={{ fontWeight: 700 }}>Invoices</Typography>
            {d.invoices.length === 0 ? <Typography variant="body2" color="text.secondary">None yet.</Typography> : d.invoices.map((i) => (
              <Typography key={i.invoice_no} variant="body2"><Link href={i.url} target="_blank" rel="noopener">{i.invoice_no}</Link> · {formatDate(i.created_at)} · {rupees(i.total)}</Typography>
            ))}
            <Typography sx={{ fontWeight: 700 }}>History</Typography>
            <Box sx={{ maxHeight: 220, overflow: "auto", display: "grid", gap: 0.5 }}>
              {d.events.map((e, n) => <Typography key={n} variant="caption">{formatDate(e.created_at)} · <b>{e.type}</b> · {e.message}</Typography>)}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions><Button onClick={() => onClose(changed)}>Close</Button></DialogActions>
    </Dialog>
  );
}

function Payments({ guard }) {
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState("");
  useEffect(() => {
    guard(() => SaasAdminServices.orders(status)).then((r) => r && setRows(r.data));
  }, [guard, status]);
  return (
    <>
      <TextField size="small" select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 160, mb: 2 }}>
        <MenuItem value="">All</MenuItem><MenuItem value="paid">Paid</MenuItem><MenuItem value="created">Not paid</MenuItem>
      </TextField>
      {!rows ? <Loader /> : (
        <TableContainer component={Card} variant="outlined">
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell><TableCell>Shop</TableCell><TableCell>For</TableCell><TableCell align="right">Total</TableCell>
                <TableCell>Status</TableCell><TableCell>Payment id</TableCell><TableCell>Invoice</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((o) => (
                <TableRow key={o.order_id}>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(o.paid_at || o.created_at)}</TableCell>
                  <TableCell>{o.business_name}<Typography variant="caption" display="block" color="text.secondary">{o.slug}</Typography></TableCell>
                  <TableCell>{o.kind} · {o.plan_code} · {o.billing_cycle}{o.quantity > 1 ? ` × ${o.quantity}` : ""}</TableCell>
                  <TableCell align="right">{rupees(o.total)}</TableCell>
                  <TableCell><Chip size="small" color={o.status === "paid" ? "success" : "default"} label={o.status} />{o.error && <Typography variant="caption" display="block" color="error">{o.error}</Typography>}</TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{o.gateway_payment_id || o.gateway_order_id}</TableCell>
                  <TableCell>{o.invoice_url ? <Link href={o.invoice_url} target="_blank" rel="noopener">{o.invoice_no}</Link> : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
}

function Plans({ guard }) {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState("");
  const load = useCallback(() => guard(() => SaasAdminServices.plans()).then((r) => r && setData(r)), [guard]);
  useEffect(() => {
    load();
  }, [load]);
  if (!data) return <Loader />;
  return (
    <Grid container spacing={2}>
      {msg && <Grid size={12}><Alert severity="success">{msg}</Alert></Grid>}
      {data.data.map((p) => <PlanEditor key={p.code} plan={p} features={data.features} onSave={async (v) => {
        const r = await guard(() => SaasAdminServices.updatePlan(v));
        if (r) {
          setMsg(`${r.data.name} saved`);
          load();
        }
      }} />)}
    </Grid>
  );
}

function PlanEditor({ plan, features, onSave }) {
  const [v, setV] = useState(plan);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const toggle = (f) => setV({ ...v, features: v.features.includes(f) ? v.features.filter((x) => x !== f) : [...v.features, f] });
  return (
    <Grid size={{ xs: 12, md: 6 }}>
      <Card variant="outlined">
        <CardContent sx={{ display: "grid", gap: 1.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>{plan.code}</Typography>
            <FormControlLabel control={<Switch checked={Boolean(v.is_active)} onChange={(e) => setV({ ...v, is_active: e.target.checked })} />} label="On sale" />
          </Box>
          <Grid container spacing={1.5}>
            <Grid size={6}><TextField size="small" fullWidth label="Name" value={v.name} onChange={set("name")} /></Grid>
            <Grid size={6}><TextField size="small" fullWidth label="Tagline" value={v.tagline || ""} onChange={set("tagline")} /></Grid>
            <Grid size={6}><TextField size="small" fullWidth type="number" label={`Price / year${plan.per_store ? " / store" : ""}`} value={v.price_year} onChange={set("price_year")} /></Grid>
            <Grid size={6}><TextField size="small" fullWidth type="number" label="Price / month (0 = yearly only)" value={v.price_month} onChange={set("price_month")} /></Grid>
            <Grid size={6}><TextField size="small" fullWidth type="number" label="Max users (0 = unlimited)" value={v.max_users} onChange={set("max_users")} /></Grid>
            <Grid size={6}><TextField size="small" fullWidth type="number" label="Max stores (0 = unlimited)" value={v.max_stores} onChange={set("max_stores")} disabled={plan.per_store} /></Grid>
          </Grid>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {Object.entries(features).map(([k, label]) => (
              <Chip key={k} size="small" label={label} color={v.features.includes(k) ? "success" : "default"} variant={v.features.includes(k) ? "filled" : "outlined"}
                onClick={["billing", "inventory", "reports", "backup"].includes(k) ? undefined : () => toggle(k)} />
            ))}
          </Box>
          <Button variant="contained" onClick={() => onSave({ ...v, code: plan.code })}>Save {plan.name}</Button>
        </CardContent>
      </Card>
    </Grid>
  );
}
