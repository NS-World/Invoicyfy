import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import { RoleServices } from "../../services/RoleServices";
import { useNotify } from "../../context/NotifyProvider";
import { apiError } from "../../utils/format";
import { useT } from "../../context/PrefsContext";

const ACTIONS = ["view", "add", "edit", "delete"];
const LABEL = { view: "View", add: "Add", edit: "Edit", delete: "Delete / Cancel" };

const PRESETS = {
  "Billing staff": { dashboard: ["view"], orders: ["view", "add", "edit"], invoices: ["view", "add"], payments: ["view", "add"], customers: ["view", "add", "edit"], products: ["view"], inventory: ["view"] },
  Accountant: { dashboard: ["view"], invoices: ["view"], payments: ["view", "add"], expenses: ["view", "add", "edit", "delete"], reports: ["view"], customers: ["view"] },
  "Store manager": {
    dashboard: ["view"], orders: ["view", "add", "edit", "delete"], invoices: ["view", "add", "edit", "delete"], payments: ["view", "add", "delete"],
    customers: ["view", "add", "edit", "delete"], products: ["view", "add", "edit", "delete"], inventory: ["view", "add"],
    expenses: ["view", "add", "edit", "delete"], reports: ["view"], settings: ["view", "edit"],
  },
};

export default function RoleForm() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const notify = useNotify();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const roleId = params.get("id") || location.state?.roleData?.role_id || null;
  const [name, setName] = useState("");
  const [perms, setPerms] = useState({});
  const [modules, setModules] = useState([]);
  const [isSystem, setIsSystem] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const list = await RoleServices.getRolesData(0, 100, "");
        setModules(list.modules || []);
        if (roleId) {
          const res = await RoleServices.getRoleDataFromId(roleId);
          setName(res.data.role_name);
          setPerms(res.data.permissions || {});
          setIsSystem(Boolean(res.data.is_system));
        }
      } catch (err) {
        setError(apiError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [roleId]);

  const has = (m, a) => (perms[m] || []).includes(a);
  const toggle = (m, a) =>
    setPerms((p) => {
      let list = new Set(p[m] || []);
      if (list.has(a)) {
        list.delete(a);
        if (a === "view") list = new Set(); // no view = no access to the module
      } else {
        list.add(a);
        list.add("view"); // any action needs view
      }
      return { ...p, [m]: [...list] };
    });
  const toggleModule = (m, actions) => setPerms((p) => ({ ...p, [m]: actions.every((a) => has(m, a)) ? [] : [...actions] }));
  const count = useMemo(() => Object.values(perms).reduce((s, a) => s + a.length, 0), [perms]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { role_name: name, permissions: perms };
      if (roleId) await RoleServices.updateRoleData({ ...payload, role_id: roleId });
      else await RoleServices.postRoleData(payload);
      notify(roleId ? "Role updated" : "Role added");
      navigate("/roles");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <Box component="form" onSubmit={submit} sx={{ maxWidth: 960, mx: "auto" }}>
      <PageHeader title={roleId ? `Edit Role · ${name}` : "Add Role"} subtitle={t("Choose exactly what people with this role can see and do")} back="/roles" />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 2 }}>
        <TextField fullWidth required label={t("Role name")} value={name} onChange={(e) => setName(e.target.value)} sx={{ maxWidth: 420 }} />
        {!isSystem && (
          <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary">
              {t("Start from:")}
            </Typography>
            {Object.keys(PRESETS).map((p) => (
              <Chip key={p} label={p} variant="outlined" onClick={() => setPerms(PRESETS[p])} />
            ))}
            <Chip label={t("Clear all")} variant="outlined" color="error" onClick={() => setPerms({})} />
          </Box>
        )}
      </Paper>

      {isSystem ? (
        <Alert severity="info">The Admin role always has full access to everything. Create another role to limit access.</Alert>
      ) : isMobile ? (
        <Box sx={{ display: "grid", gap: 1.5 }}>
          {modules.map((m) => (
            <Paper key={m.key} sx={{ p: 1.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography sx={{ fontWeight: 700 }}>{m.label}</Typography>
                <Checkbox checked={m.actions.every((a) => has(m.key, a))} indeterminate={!m.actions.every((a) => has(m.key, a)) && m.actions.some((a) => has(m.key, a))} onChange={() => toggleModule(m.key, m.actions)} />
              </Box>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {m.actions.map((a) => (
                  <Chip key={a} label={LABEL[a]} color={has(m.key, a) ? "primary" : "default"} variant={has(m.key, a) ? "filled" : "outlined"} onClick={() => toggle(m.key, a)} />
                ))}
              </Box>
            </Paper>
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead sx={{ bgcolor: "action.hover" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Module</TableCell>
                {ACTIONS.map((a) => (
                  <TableCell key={a} align="center" sx={{ fontWeight: 700 }}>
                    {LABEL[a]}
                  </TableCell>
                ))}
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  {t("All")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {modules.map((m) => {
                const all = m.actions.every((a) => has(m.key, a));
                return (
                  <TableRow key={m.key} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{m.label}</TableCell>
                    {ACTIONS.map((a) => (
                      <TableCell key={a} align="center">
                        {m.actions.includes(a) ? <Checkbox checked={has(m.key, a)} onChange={() => toggle(m.key, a)} inputProps={{ "aria-label": `${m.label} ${a}` }} /> : <Typography color="text.disabled">—</Typography>}
                      </TableCell>
                    ))}
                    <TableCell align="center">
                      <Checkbox checked={all} indeterminate={!all && m.actions.some((a) => has(m.key, a))} onChange={() => toggleModule(m.key, m.actions)} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box sx={{ display: "flex", gap: 1, mt: 2, justifyContent: "flex-end", alignItems: "center" }}>
        {!isSystem && (
          <Typography variant="body2" color="text.secondary" sx={{ mr: "auto" }}>
            {count} permission(s) selected
          </Typography>
        )}
        <Button variant="outlined" onClick={() => navigate("/roles")}>
          {t("Cancel")}
        </Button>
        <Button type="submit" variant="contained" disabled={saving || !name.trim()}>
          {saving ? "Saving..." : "Save Role"}
        </Button>
      </Box>
    </Box>
  );
}
