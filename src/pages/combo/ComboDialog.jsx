import { useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { ComboServices } from "../../services/V4Services";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { apiError, formatCurrency } from "../../utils/format";

import { DAYS } from "../../utils/v4";
const payable = (p) => (p ? (Number(p.price_includes_tax) ? Number(p.price) : Number(p.price) * (1 + Number(p.gst_rate) / 100)) : 0);

/** Combo ("2 scoops + 1 shake = ₹199") or happy hour ("3-5 pm 10% off") offer. */
export default function ComboDialog({ offer, storeId, products, categories, onClose, onSaved }) {
  const t = useT();
  const notify = useNotify();
  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.product_id, p])), [products]);
  const [f, setF] = useState(() =>
    offer
      ? {
          ...offer,
          combo_items: offer.combo_items.map((c) => ({ key: Math.random(), product: byId[c.product_id] || { product_id: c.product_id, name: c.name }, qty: String(c.qty) })),
          targets:
            offer.applies_to === "product" ? offer.target_ids.map((id) => byId[id]).filter(Boolean) : offer.applies_to === "category" ? offer.target_ids : [],
          timed: Boolean(offer.start_time),
          is_active: Boolean(offer.is_active),
        }
      : {
          name: "",
          offer_type: "combo",
          combo_items: [
            { key: 1, product: null, qty: "1" },
            { key: 2, product: null, qty: "1" },
          ],
          combo_price: "",
          discount_percent: "",
          applies_to: "all",
          targets: [],
          days: "0123456",
          timed: false,
          start_time: "15:00",
          end_time: "17:00",
          valid_from: "",
          valid_to: "",
          min_bill: "",
          is_active: true,
        }
  );
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const regular = f.combo_items.reduce((s, c) => s + payable(c.product) * (Number(c.qty) || 0), 0);

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        store_id: storeId,
        name: f.name,
        offer_type: f.offer_type,
        days: f.days,
        start_time: f.timed ? f.start_time : null,
        end_time: f.timed ? f.end_time : null,
        valid_from: f.valid_from || null,
        valid_to: f.valid_to || null,
        min_bill: Number(f.min_bill) || 0,
        is_active: f.is_active,
        combo_items: f.combo_items.filter((c) => c.product).map((c) => ({ product_id: c.product.product_id, qty: Number(c.qty) || 1 })),
        combo_price: Number(f.combo_price) || null,
        discount_percent: Number(f.discount_percent) || null,
        applies_to: f.applies_to,
        target_ids: f.applies_to === "product" ? f.targets.map((p) => p.product_id) : f.applies_to === "category" ? f.targets : [],
      };
      const res = offer ? await ComboServices.update({ ...body, offer_id: offer.offer_id }) : await ComboServices.add(body);
      onSaved(res);
    } catch (e) {
      notify(apiError(e), "error");
    }
    setSaving(false);
  };

  const toggleDay = (d) => setF((x) => ({ ...x, days: x.days.includes(d) ? x.days.replace(d, "") : [...x.days, d].sort().join("") }));

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{offer ? t("Edit offer") : t("New offer")}</DialogTitle>
      <DialogContent dividers>
        <ToggleButtonGroup exclusive fullWidth color="primary" value={f.offer_type} onChange={(_, v) => v && setF((x) => ({ ...x, offer_type: v }))} sx={{ mb: 2 }}>
          <ToggleButton value="combo">{t("Combo price")}</ToggleButton>
          <ToggleButton value="happy_hour">{t("Happy hour % off")}</ToggleButton>
        </ToggleButtonGroup>
        <TextField fullWidth label={t("Offer name (shown on the bill)")} value={f.name} onChange={set("name")} sx={{ mb: 2 }} placeholder={f.offer_type === "combo" ? "2 Scoop + Shake" : "Evening Happy Hour"} />

        {f.offer_type === "combo" ? (
          <>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
              {t("Items in the combo")}
            </Typography>
            {f.combo_items.map((c, i) => (
              <Grid container spacing={1} key={c.key} sx={{ mb: 1 }} alignItems="center">
                <Grid size={{ xs: 7, sm: 8 }}>
                  <Autocomplete
                    options={products}
                    value={c.product}
                    onChange={(_, v) => setF((x) => ({ ...x, combo_items: x.combo_items.map((y, n) => (n === i ? { ...y, product: v } : y)) }))}
                    getOptionLabel={(p) => `${p.name} (${formatCurrency(payable(p))})`}
                    isOptionEqualToValue={(a, b) => a.product_id === b.product_id}
                    renderInput={(p) => <TextField {...p} size="small" label={`${t("Item")} ${i + 1}`} />}
                  />
                </Grid>
                <Grid size={{ xs: 3, sm: 3 }}>
                  <TextField size="small" type="number" label={t("Qty")} value={c.qty} onChange={(e) => setF((x) => ({ ...x, combo_items: x.combo_items.map((y, n) => (n === i ? { ...y, qty: e.target.value } : y)) }))} slotProps={{ htmlInput: { min: 1, step: "any" } }} />
                </Grid>
                <Grid size={{ xs: 2, sm: 1 }}>
                  <IconButton size="small" color="error" onClick={() => setF((x) => ({ ...x, combo_items: x.combo_items.filter((_, n) => n !== i) }))} aria-label={t("Remove")}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
            <Button size="small" startIcon={<AddIcon />} onClick={() => setF((x) => ({ ...x, combo_items: [...x.combo_items, { key: Math.random(), product: null, qty: "1" }] }))}>
              {t("Add item")}
            </Button>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={6}>
                <TextField fullWidth type="number" label={t("Combo price (incl. GST)")} value={f.combo_price} onChange={set("combo_price")} slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }} />
              </Grid>
              <Grid size={6} sx={{ display: "flex", alignItems: "center" }}>
                <Typography variant="body2">
                  {t("Normal price")}: <b>{formatCurrency(regular)}</b>
                  {Number(f.combo_price) > 0 && regular > Number(f.combo_price) && (
                    <Box component="span" sx={{ color: "success.main", display: "block" }}>
                      {t("Customer saves")} {formatCurrency(regular - Number(f.combo_price))}
                    </Box>
                  )}
                </Typography>
              </Grid>
            </Grid>
          </>
        ) : (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth type="number" label={t("Discount")} value={f.discount_percent} onChange={set("discount_percent")} slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField select fullWidth label={t("On")} value={f.applies_to} onChange={(e) => setF((x) => ({ ...x, applies_to: e.target.value, targets: [] }))}>
                <MenuItem value="all">{t("Every item")}</MenuItem>
                <MenuItem value="category">{t("Some categories")}</MenuItem>
                <MenuItem value="product">{t("Some items")}</MenuItem>
              </TextField>
            </Grid>
            {f.applies_to === "category" && (
              <Grid size={12}>
                <Autocomplete multiple options={categories} value={f.targets} onChange={(_, v) => setF((x) => ({ ...x, targets: v }))} renderInput={(p) => <TextField {...p} label={t("Categories")} />} />
              </Grid>
            )}
            {f.applies_to === "product" && (
              <Grid size={12}>
                <Autocomplete
                  multiple
                  options={products}
                  value={f.targets}
                  onChange={(_, v) => setF((x) => ({ ...x, targets: v }))}
                  getOptionLabel={(p) => p.name}
                  isOptionEqualToValue={(a, b) => a.product_id === b.product_id}
                  renderInput={(p) => <TextField {...p} label={t("Items")} />}
                />
              </Grid>
            )}
          </Grid>
        )}

        <Typography variant="body2" sx={{ fontWeight: 700, mt: 2, mb: 0.5 }}>
          {t("When")}
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap" }}>
          {DAYS.map((d, i) => (
            <FormControlLabel key={d} sx={{ mr: 1 }} control={<Checkbox size="small" checked={f.days.includes(String(i))} onChange={() => toggleDay(String(i))} />} label={t(d)} />
          ))}
        </Box>
        <FormControlLabel control={<Switch checked={f.timed} onChange={(e) => setF((x) => ({ ...x, timed: e.target.checked }))} />} label={t("Only between certain hours")} />
        {f.timed && (
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={6}>
              <TextField fullWidth type="time" label={t("From")} value={f.start_time || ""} onChange={set("start_time")} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={6}>
              <TextField fullWidth type="time" label={t("To")} value={f.end_time || ""} onChange={set("end_time")} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
          </Grid>
        )}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField fullWidth type="date" label={t("Valid from")} value={f.valid_from || ""} onChange={set("valid_from")} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField fullWidth type="date" label={t("Valid till")} value={f.valid_to || ""} onChange={set("valid_to")} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth type="number" label={t("Min bill ₹")} value={f.min_bill || ""} onChange={set("min_bill")} />
          </Grid>
        </Grid>
        <FormControlLabel sx={{ mt: 1 }} control={<Switch checked={f.is_active} onChange={(e) => setF((x) => ({ ...x, is_active: e.target.checked }))} />} label={t("Offer is on")} />
        <Alert severity="info" sx={{ mt: 1 }}>
          {t("Offers apply on their own in Quick Bill. The cashier's discount limit does not count them, and they can be switched off for a single bill.")}
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("Cancel")}</Button>
        <Button variant="contained" onClick={save} disabled={saving || !f.name.trim()}>
          {t("Save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
