import { useEffect, useState } from "react";
import { Alert, Box, Button, FormControlLabel, Grid, MenuItem, Paper, Switch, TextField } from "@mui/material";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import { UserServices } from "../../services/UserServices";
import { RoleServices } from "../../services/RoleServices";
import useStores from "../../hooks/useStores";
import { useNotify } from "../../context/NotifyProvider";
import { apiError } from "../../utils/format";
import { useT } from "../../context/PrefsContext";

const blank = { name: "", email: "", phone: "", city: "", role_id: "", store_id: "", password: "", is_active: true };

export default function UserForm() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const notify = useNotify();
  const { stores } = useStores();
  const userId = params.get("id") || location.state?.userData?.user_id || null;
  const [form, setForm] = useState(blank);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    RoleServices.getRolesData(0, 100, "").then((r) => setRoles(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!userId) return;
    UserServices.getUserDataFromId(userId)
      .then((res) => {
        const d = res.data;
        setForm({ ...blank, ...Object.fromEntries(Object.keys(blank).map((k) => [k, d[k] ?? blank[k]])), password: "", is_active: Boolean(Number(d.is_active)) });
      })
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, [userId]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (userId) await UserServices.updateUserData({ ...form, user_id: userId });
      else await UserServices.postUserData(form);
      notify(userId ? "User updated" : "User created");
      navigate("/users");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;
  return (
    <Box component="form" onSubmit={submit} sx={{ maxWidth: 720, mx: "auto" }}>
      <PageHeader title={userId ? "Edit User" : "Add User"} back="/users" />
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth required label={t("Name")} value={form.name} onChange={set("name")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth required type="email" label={t("Email (login)")} value={form.email} onChange={set("email")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={t("Phone")} value={form.phone || ""} onChange={set("phone")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={t("City")} value={form.city || ""} onChange={set("city")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth required label={t("Role")} value={form.role_id} onChange={set("role_id")} helperText="Admin: everything · Manager: own store + settings · Staff: billing">
              {roles.map((r) => (
                <MenuItem key={r.role_id} value={r.role_id}>
                  {r.role_name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth required label={t("Store")} value={form.store_id} onChange={set("store_id")}>
              {stores.map((s) => (
                <MenuItem key={s.store_id} value={s.store_id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              required={!userId}
              type="password"
              label={userId ? "New password (optional)" : "Password"}
              helperText={t("At least 8 characters")}
              value={form.password}
              onChange={set("password")}
              autoComplete="new-password"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControlLabel control={<Switch checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />} label={t("Active (can log in)")} />
          </Grid>
        </Grid>
        <Box sx={{ display: "flex", gap: 1, mt: 3, justifyContent: "flex-end" }}>
          <Button variant="outlined" onClick={() => navigate("/users")}>
            {t("Cancel")}
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? "Saving..." : userId ? "Update User" : "Create User"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
