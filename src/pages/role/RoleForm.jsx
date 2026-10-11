import { useEffect, useState } from "react";
import { Alert, Box, Button, Paper, TextField } from "@mui/material";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { RoleServices } from "../../services/RoleServices";
import { useNotify } from "../../context/NotifyProvider";
import { apiError } from "../../utils/format";

export default function RoleForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const notify = useNotify();
  const roleId = params.get("id") || location.state?.roleData?.role_id || null;
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!roleId) return;
    RoleServices.getRoleDataFromId(roleId)
      .then((res) => setName(res.data?.role_name || ""))
      .catch((err) => setError(apiError(err)));
  }, [roleId]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (roleId) await RoleServices.updateRoleData({ role_id: roleId, role_name: name });
      else await RoleServices.postRoleData({ role_name: name });
      notify(roleId ? "Role updated" : "Role added");
      navigate("/roles");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box component="form" onSubmit={submit} sx={{ maxWidth: 520, mx: "auto" }}>
      <PageHeader title={roleId ? "Edit Role" : "Add Role"} back="/roles" />
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField fullWidth required label="Role name" value={name} onChange={(e) => setName(e.target.value)} />
        <Box sx={{ display: "flex", gap: 1, mt: 3, justifyContent: "flex-end" }}>
          <Button variant="outlined" onClick={() => navigate("/roles")}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saving || !name.trim()}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
