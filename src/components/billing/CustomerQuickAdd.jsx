import { useEffect, useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, TextField, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { CustomerServices } from "../../services/CustomerServices";
import useMeta from "../../hooks/useMeta";
import { apiError } from "../../utils/format";
import { GSTIN_REGEX } from "../../utils/gst";
import { useT } from "../../context/PrefsContext";

const blank = { customer_type: "B2C", name: "", company_name: "", phone: "", email: "", gstin: "", state_code: "", address: "", city: "", pincode: "" };

export default function CustomerQuickAdd({ open, onClose, onCreated, initialName = "" }) {
  const t = useT();
  const meta = useMeta();
  const [form, setForm] = useState({ ...blank, name: initialName });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      setForm({ ...blank, name: initialName });
      setError("");
    }
  }, [open, initialName]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const gstinInvalid = form.gstin && !GSTIN_REGEX.test(form.gstin.toUpperCase());

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await CustomerServices.postCustomerData({ ...form, gstin: form.gstin.toUpperCase() });
      onCreated(res.data);
      setForm(blank);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Customer</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <ToggleButtonGroup
          exclusive
          size="small"
          color="primary"
          value={form.customer_type}
          onChange={(_, v) => v && setForm((f) => ({ ...f, customer_type: v }))}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="B2C">{t("Consumer (B2C)")}</ToggleButton>
          <ToggleButton value="B2B">{t("Business (B2B)")}</ToggleButton>
        </ToggleButtonGroup>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth required label={t("Name")} value={form.name} onChange={set("name")} autoFocus />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={t("Mobile")} value={form.phone} onChange={set("phone")} inputMode="tel" />
          </Grid>
          {form.customer_type === "B2B" && (
            <>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label={t("Company / Trade name")} value={form.company_name} onChange={set("company_name")} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  required
                  label={t("GSTIN")}
                  value={form.gstin}
                  onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase(), state_code: e.target.value.slice(0, 2).match(/^\d\d$/) ? e.target.value.slice(0, 2) : f.state_code }))}
                  error={Boolean(gstinInvalid)}
                  helperText={gstinInvalid ? "Format: 24ABCDE1234F1Z5" : " "}
                  slotProps={{ htmlInput: { maxLength: 15 } }}
                />
              </Grid>
            </>
          )}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label={t("State")} value={form.state_code} onChange={set("state_code")}>
              <MenuItem value="">—</MenuItem>
              {meta.states.map((s) => (
                <MenuItem key={s.code} value={s.code}>
                  {s.code} - {s.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={t("City")} value={form.city} onChange={set("city")} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth label={t("Address")} value={form.address} onChange={set("address")} multiline minRows={2} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("Cancel")}</Button>
        <Button variant="contained" onClick={save} disabled={saving || !form.name || gstinInvalid}>
          {saving ? "Saving..." : "Save Customer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
