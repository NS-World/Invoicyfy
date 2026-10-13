import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  InputAdornment,
  MenuItem,
  Switch,
  TextField,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { CouponServices } from "../../services/V3Services";
import { useT } from "../../context/PrefsContext";
import { apiError } from "../../utils/format";

const blank = { code: "", description: "", discount_type: "percent", value: "", max_discount: "", min_bill: "", valid_from: "", valid_to: "", usage_limit: "", per_customer_limit: "", is_active: true };

/** Create / edit a coupon. Empty limits mean "no limit". */
export default function CouponDialog({ coupon, storeId, onClose, onSaved }) {
  const t = useT();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const [f, setF] = useState(() => (coupon ? { ...blank, ...Object.fromEntries(Object.entries(coupon).map(([k, v]) => [k, v ?? ""])), is_active: Boolean(coupon.is_active) } : blank));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const used = coupon && coupon.used_count > 0;

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const body = { ...f, store_id: storeId, code: f.code.toUpperCase().replace(/\s+/g, "") };
      const res = coupon ? await CouponServices.update({ ...body, coupon_id: coupon.coupon_id }) : await CouponServices.add(body);
      onSaved(res);
    } catch (e) {
      setError(apiError(e));
    }
    setSaving(false);
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" fullScreen={phone}>
      <DialogTitle>{coupon ? t("Edit coupon") : t("New coupon")}</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              required
              autoFocus={!coupon}
              label={t("Code")}
              value={f.code}
              onChange={(e) => setF((x) => ({ ...x, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") }))}
              helperText={used ? t("Used on bills, so the code cannot change") : t("Customers tell this code, e.g. DIWALI20")}
              disabled={Boolean(used)}
              slotProps={{ htmlInput: { maxLength: 40 } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={t("Description")} value={f.description} onChange={set("description")} placeholder={t("Diwali offer")} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField select fullWidth label={t("Discount type")} value={f.discount_type} onChange={set("discount_type")}>
              <MenuItem value="percent">{t("% off")}</MenuItem>
              <MenuItem value="flat">{t("₹ off")}</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField
              fullWidth
              required
              type="number"
              label={f.discount_type === "percent" ? t("Discount %") : t("Discount ₹")}
              value={f.value}
              onChange={set("value")}
              slotProps={{ htmlInput: { min: 0, step: "any", inputMode: "decimal" } }}
            />
          </Grid>
          {f.discount_type === "percent" && (
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="number"
                label={t("Max discount ₹")}
                value={f.max_discount}
                onChange={set("max_discount")}
                helperText={t("Empty = no cap")}
                slotProps={{ htmlInput: { min: 0, step: "any", inputMode: "decimal" } }}
              />
            </Grid>
          )}
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="number"
              label={t("Minimum bill ₹")}
              value={f.min_bill}
              onChange={set("min_bill")}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, htmlInput: { min: 0, step: "any", inputMode: "decimal" } }}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField fullWidth type="date" label={t("Valid from")} value={f.valid_from} onChange={set("valid_from")} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField fullWidth type="date" label={t("Valid till")} value={f.valid_to} onChange={set("valid_to")} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              type="number"
              label={t("Total uses allowed")}
              value={f.usage_limit}
              onChange={set("usage_limit")}
              helperText={t("Empty = unlimited")}
              slotProps={{ htmlInput: { min: 1, step: 1, inputMode: "numeric" } }}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              type="number"
              label={t("Uses per customer")}
              value={f.per_customer_limit}
              onChange={set("per_customer_limit")}
              helperText={t("Needs the customer on the bill")}
              slotProps={{ htmlInput: { min: 1, step: 1, inputMode: "numeric" } }}
            />
          </Grid>
          <Grid size={12}>
            <FormControlLabel control={<Switch checked={f.is_active} onChange={(e) => setF((x) => ({ ...x, is_active: e.target.checked }))} />} label={t("Active")} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("Cancel")}</Button>
        <Button variant="contained" onClick={save} disabled={saving || f.code.length < 3 || !(Number(f.value) > 0)}>
          {t("Save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
