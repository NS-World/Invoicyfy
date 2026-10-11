import { useEffect, useState } from "react";
import { Alert, Box, Button, Grid, Paper, Tab, Tabs, TextField, Typography } from "@mui/material";
import PaletteIcon from "@mui/icons-material/Palette";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import StoreFields from "../../components/forms/StoreFields";
import { blankStore, storeFromApi, storeInvalid } from "../../components/forms/storeForm";
import { StoreServices } from "../../services/StoreServices";
import { AuthServices } from "../../services/AuthServices";
import { clearStoreCache } from "../../hooks/useStores";
import { useAuth } from "../../context/useAuth";
import { useNotify } from "../../context/NotifyProvider";
import { apiError } from "../../utils/format";

function BusinessProfile() {
  const { user, can } = useAuth();
  const isManager = can("settings", "edit");
  const notify = useNotify();
  const [form, setForm] = useState(blankStore);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.store_id) {
      setLoading(false);
      return;
    }
    StoreServices.getStoreDataFromId(user.store_id)
      .then((res) => setForm(storeFromApi(res.data)))
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, [user?.store_id]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await StoreServices.updateStoreData({ ...form, store_id: user.store_id });
      clearStoreCache();
      notify("Business details saved");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;
  if (!user?.store_id) return <Alert severity="info">Your account is not linked to a store.</Alert>;
  return (
    <Paper component="form" onSubmit={save} sx={{ p: { xs: 2, sm: 3 } }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!isManager && <Alert severity="info" sx={{ mb: 2 }}>Your role can only view business details.</Alert>}
      <fieldset disabled={!isManager} style={{ border: 0, padding: 0, margin: 0 }}>
        <StoreFields form={form} setForm={setForm} />
      </fieldset>
      {isManager && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
          <Button type="submit" variant="contained" disabled={saving || storeInvalid(form)}>
            {saving ? "Saving..." : "Save Business Details"}
          </Button>
        </Box>
      )}
    </Paper>
  );
}

function ChangePassword() {
  const notify = useNotify();
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const mismatch = form.confirm && form.confirm !== form.new_password;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await AuthServices.changePassword(form);
      notify("Password changed");
      setForm({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper component="form" onSubmit={save} sx={{ p: { xs: 2, sm: 3 }, maxWidth: 480 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={2}>
        <Grid size={12}>
          <TextField fullWidth type="password" label="Current password" value={form.current_password} onChange={set("current_password")} autoComplete="current-password" />
        </Grid>
        <Grid size={12}>
          <TextField fullWidth type="password" label="New password" helperText="At least 8 characters" value={form.new_password} onChange={set("new_password")} autoComplete="new-password" />
        </Grid>
        <Grid size={12}>
          <TextField fullWidth type="password" label="Confirm new password" value={form.confirm} onChange={set("confirm")} error={Boolean(mismatch)} helperText={mismatch ? "Passwords do not match" : " "} autoComplete="new-password" />
        </Grid>
      </Grid>
      <Button type="submit" variant="contained" sx={{ mt: 1 }} disabled={saving || !form.current_password || form.new_password.length < 8 || mismatch}>
        Change Password
      </Button>
    </Paper>
  );
}

export default function Settings() {
  const [tab, setTab] = useState("business");
  const { user, can } = useAuth();
  const navigate = useNavigate();
  return (
    <Box sx={{ maxWidth: 960, mx: "auto" }}>
      <PageHeader title="Settings" subtitle={user ? `${user.name} · ${user.email}` : ""} />
      {can("settings") && (
        <Alert
          severity="info"
          icon={<PaletteIcon />}
          sx={{ mb: 2 }}
          action={
            <Button size="small" onClick={() => navigate("/settings/invoice-design")}>
              Open
            </Button>
          }
        >
          Change invoice & receipt templates, logo, colours, sections and QR codes in <b>Invoice Design</b>.
        </Alert>
      )}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="business" label="Business details" />
        <Tab value="password" label="Change password" />
      </Tabs>
      {tab === "business" ? <BusinessProfile /> : <ChangePassword />}
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
        Receipt paper width (80mm / 58mm) is chosen on the invoice screen and remembered on this device.
      </Typography>
    </Box>
  );
}
