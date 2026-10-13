import { useEffect, useState } from "react";
import { Alert, Box, Button, FormControlLabel, Grid, MenuItem, Paper, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import StatCard from "../../components/common/StatCard";
import { CustomerServices } from "../../services/CustomerServices";
import { useNotify } from "../../context/NotifyProvider";
import useMeta from "../../hooks/useMeta";
import { apiError, formatCurrency } from "../../utils/format";
import { GSTIN_REGEX } from "../../utils/gst";
import { useT } from "../../context/PrefsContext";
import CustomerPoints from "../../components/v3/CustomerPoints";

const blank = {
  customer_type: "B2C",
  name: "",
  company_name: "",
  phone: "",
  email: "",
  gstin: "",
  address: "",
  city: "",
  state_code: "",
  pincode: "",
  shipping_address: "",
  notes: "",
  birthday: "",
  anniversary: "",
  marketing_opt_in: true,
};

export default function CustomerForm() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const notify = useNotify();
  const meta = useMeta();
  const customerId = params.get("id") || location.state?.customersData?.customer_id || location.state?.customersData?.id || null;

  const [form, setForm] = useState(blank);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(Boolean(customerId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!customerId) return;
    CustomerServices.getCustomerDataFromId(customerId)
      .then((res) => {
        const d = res.data;
        setForm({ ...Object.fromEntries(Object.keys(blank).map((k) => [k, d[k] ?? ""])), marketing_opt_in: d.marketing_opt_in === undefined ? true : Boolean(Number(d.marketing_opt_in)) });
        setSummary(d.summary);
      })
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, [customerId]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const gstinInvalid = form.gstin && !GSTIN_REGEX.test(form.gstin);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, customer_id: customerId || undefined };
      if (customerId) await CustomerServices.updateCustomerData(payload);
      else await CustomerServices.postCustomerData(payload);
      notify(customerId ? "Customer updated" : "Customer added");
      navigate("/customers");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <Box component="form" onSubmit={submit} sx={{ maxWidth: 900, mx: "auto" }}>
      <PageHeader title={customerId ? "Edit Customer" : "Add Customer"} back="/customers" />
      {summary && (
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatCard label={t("Invoices")} value={summary.invoice_count} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatCard label={t("Billed")} value={formatCurrency(summary.total_billed)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatCard label={t("Paid")} value={formatCurrency(summary.total_paid)} color="success.main" />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatCard label={t("Outstanding")} value={formatCurrency(summary.outstanding)} color="warning.dark" onClick={() => navigate("/invoices")} />
          </Grid>
        </Grid>
      )}
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <ToggleButtonGroup exclusive color="primary" size="small" value={form.customer_type} onChange={(_, v) => v && setForm((f) => ({ ...f, customer_type: v }))} sx={{ mb: 2 }}>
          <ToggleButton value="B2C">{t("Consumer (B2C)")}</ToggleButton>
          <ToggleButton value="B2B">{t("Business (B2B)")}</ToggleButton>
        </ToggleButtonGroup>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth required label={t("Contact name")} value={form.name} onChange={set("name")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={t("Mobile")} value={form.phone} onChange={set("phone")} slotProps={{ htmlInput: { inputMode: "tel" } }} />
          </Grid>
          {form.customer_type === "B2B" && (
            <>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label={t("Company / trade name")} value={form.company_name} onChange={set("company_name")} helperText={t("Printed as the buyer name on invoices")} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  required
                  label={t("GSTIN")}
                  value={form.gstin}
                  onChange={(e) => {
                    const g = e.target.value.toUpperCase().trim();
                    setForm((f) => ({ ...f, gstin: g, state_code: /^\d\d/.test(g) ? g.slice(0, 2) : f.state_code }));
                  }}
                  error={Boolean(gstinInvalid)}
                  helperText={gstinInvalid ? "Format: 24ABCDE1234F1Z5" : "State is filled from GSTIN"}
                  slotProps={{ htmlInput: { maxLength: 15 } }}
                />
              </Grid>
            </>
          )}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth type="email" label={t("Email")} value={form.email} onChange={set("email")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label={t("State")} value={form.state_code} onChange={set("state_code")} helperText={t("Decides CGST+SGST or IGST")}>
              <MenuItem value="">—</MenuItem>
              {meta.states.map((s) => (
                <MenuItem key={s.code} value={s.code}>
                  {s.code} - {s.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={12}>
            <TextField fullWidth multiline minRows={2} label={t("Billing address")} value={form.address} onChange={set("address")} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth label={t("City")} value={form.city} onChange={set("city")} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth label={t("PIN code")} value={form.pincode} onChange={set("pincode")} slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 6 } }} />
          </Grid>
          {form.customer_type === "B2B" && (
            <Grid size={12}>
              <TextField fullWidth multiline minRows={2} label={t("Shipping address (if different)")} value={form.shipping_address} onChange={set("shipping_address")} />
            </Grid>
          )}
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField fullWidth type="date" label={t("Birthday")} value={form.birthday || ""} onChange={set("birthday")} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField fullWidth type="date" label={t("Anniversary")} value={form.anniversary || ""} onChange={set("anniversary")} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={t("Notes")} value={form.notes} onChange={set("notes")} />
          </Grid>
          <Grid size={12}>
            <FormControlLabel
              control={<Switch checked={form.marketing_opt_in} onChange={(e) => setForm((f) => ({ ...f, marketing_opt_in: e.target.checked }))} />}
              label={t("Send offers & new flavour updates on WhatsApp")}
            />
          </Grid>
        </Grid>
        <Box sx={{ display: "flex", gap: 1, mt: 3, justifyContent: "flex-end" }}>
          <Button variant="outlined" onClick={() => navigate("/customers")}>
            {t("Cancel")}
          </Button>
          <Button type="submit" variant="contained" disabled={saving || Boolean(gstinInvalid)}>
            {saving ? "Saving..." : customerId ? "Update Customer" : "Add Customer"}
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          {t("Only the name is required. Add GSTIN for business customers to issue GST tax invoices.")}
        </Typography>
      </Paper>
      {customerId && <CustomerPoints customerId={customerId} />}
    </Box>
  );
}
