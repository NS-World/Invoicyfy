import { useEffect, useMemo, useState } from "react";
import { Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, InputAdornment, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { RecipeServices } from "../../services/V4Services";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { apiError, formatCurrency } from "../../utils/format";

/** What ONE unit of a product uses (e.g. 1 sundae = 0.2 L milk + 1 cone + 0.05 kg topping). */
export default function RecipeDialog({ product, products, onClose, onSaved }) {
  const t = useT();
  const notify = useNotify();
  const [target, setTarget] = useState(product || null);
  const [lines, setLines] = useState([]);
  const [saving, setSaving] = useState(false);
  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.product_id, p])), [products]);

  useEffect(() => {
    if (!target) return;
    RecipeServices.get(target.product_id)
      .then((r) => setLines(r.data.items.map((i) => ({ key: Math.random(), ingredient: byId[i.ingredient_id] || { product_id: i.ingredient_id, name: i.name, unit: i.unit, cost_price: i.cost_price }, quantity: String(i.quantity) }))))
      .catch((e) => notify(apiError(e), "error"));
  }, [target, byId, notify]);

  const cost = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.ingredient?.cost_price) || 0), 0);
  const price = target ? (Number(target.price_includes_tax) ? Number(target.price) / (1 + Number(target.gst_rate) / 100) : Number(target.price)) : 0;
  const setLine = (i, patch) => setLines((ls) => ls.map((l, n) => (n === i ? { ...l, ...patch } : l)));

  const save = async () => {
    setSaving(true);
    try {
      const res = await RecipeServices.save(
        target.product_id,
        lines.filter((l) => l.ingredient && Number(l.quantity) > 0).map((l) => ({ ingredient_id: l.ingredient.product_id, quantity: Number(l.quantity) }))
      );
      onSaved(res);
    } catch (e) {
      notify(apiError(e), "error");
    }
    setSaving(false);
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{product ? `${t("Recipe")}: ${product.name}` : t("New recipe")}</DialogTitle>
      <DialogContent dividers>
        {!product && (
          <Autocomplete
            options={products}
            value={target}
            onChange={(_, v) => setTarget(v)}
            getOptionLabel={(p) => p.name}
            isOptionEqualToValue={(a, b) => a.product_id === b.product_id}
            renderInput={(p) => <TextField {...p} label={t("Item you sell (e.g. Brownie Sundae)")} />}
            sx={{ mb: 2 }}
          />
        )}
        {target && (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              {t("Enter what ONE {unit} of {name} uses. When it is billed, these ingredients go out of stock automatically.", { unit: target.unit || "pcs", name: target.name })}
            </Alert>
            {lines.map((l, i) => (
              <Grid container spacing={1} key={l.key} sx={{ mb: 1 }} alignItems="center">
                <Grid size={{ xs: 12, sm: 6.5 }}>
                  <Autocomplete
                    options={products.filter((p) => p.product_id !== target.product_id)}
                    value={l.ingredient}
                    onChange={(_, v) => setLine(i, { ingredient: v })}
                    getOptionLabel={(p) => p.name}
                    isOptionEqualToValue={(a, b) => a.product_id === b.product_id}
                    renderInput={(p) => <TextField {...p} size="small" label={t("Ingredient")} />}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    size="small"
                    fullWidth
                    type="number"
                    label={t("Qty used")}
                    value={l.quantity}
                    onChange={(e) => setLine(i, { quantity: e.target.value })}
                    slotProps={{ inputLabel: { shrink: true }, input: { endAdornment: <InputAdornment position="end">{l.ingredient?.unit || ""}</InputAdornment> }, htmlInput: { min: 0, step: "any", inputMode: "decimal" } }}
                  />
                </Grid>
                <Grid size={{ xs: 4, sm: 1.8 }}>
                  <Typography variant="body2" color="text.secondary">
                    {formatCurrency((Number(l.quantity) || 0) * (Number(l.ingredient?.cost_price) || 0))}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 2, sm: 0.7 }}>
                  <IconButton size="small" color="error" onClick={() => setLines((ls) => ls.filter((_, n) => n !== i))} aria-label={t("Remove")}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
            <Button startIcon={<AddIcon />} onClick={() => setLines((ls) => [...ls, { key: Math.random(), ingredient: null, quantity: "" }])}>
              {t("Add ingredient")}
            </Button>
            <Box sx={{ mt: 2, p: 1.5, bgcolor: "action.hover", borderRadius: 2, display: "flex", gap: 3, flexWrap: "wrap" }}>
              <Typography variant="body2">
                {t("Cost to make")}: <b>{formatCurrency(cost)}</b>
              </Typography>
              <Typography variant="body2">
                {t("Selling price (before GST)")}: <b>{formatCurrency(price)}</b>
              </Typography>
              <Typography variant="body2" color={price - cost >= 0 ? "success.main" : "error.main"}>
                {t("Profit")}: <b>{formatCurrency(price - cost)}</b> {price > 0 ? `(${Math.round(((price - cost) / price) * 100)}%)` : ""}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {t("Ingredient cost comes from the cost price on each product (updated by purchase bills).")}
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("Cancel")}</Button>
        <Button variant="contained" onClick={save} disabled={!target || saving}>
          {lines.length ? t("Save recipe") : t("Remove recipe")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
