import { useState } from "react";
import { Box, Button, Checkbox, Collapse, FormControlLabel, IconButton, MenuItem, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import TuneIcon from "@mui/icons-material/Tune";
import ScaleIcon from "@mui/icons-material/Scale";
import ShoppingBasketIcon from "@mui/icons-material/ShoppingBasketOutlined";
import useMeta from "../../hooks/useMeta";
import { useT } from "../../context/PrefsContext";
import { calcLine } from "../../utils/gst";
import { formatCurrency, formatNumber } from "../../utils/format";
import { gramsLabel, gramsPerUnit, isWeightUnit, rateSuffix } from "../../utils/weight";
import LooseDialog from "./LooseDialog";

/**
 * The bill being made: one compact line per item with a − qty + stepper (or the weight for loose items),
 * amount and remove. "Details" opens price, GST, discount, HSN and a note for that line.
 */
export default function BillCart({ items, onChange, interstate, showDiscount = true, maxHeight }) {
  const t = useT();
  const meta = useMeta();
  const [open, setOpen] = useState({});
  const [loose, setLoose] = useState(null);

  const update = (key, patch) => onChange(items.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const remove = (key) => onChange(items.filter((it) => it.key !== key));
  const step = (it, d) => {
    const q = Math.round(((Number(it.quantity) || 0) + d) * 1000) / 1000;
    if (q <= 0) remove(it.key);
    else update(it.key, { quantity: q });
  };

  const num = (label, value, onValue, props = {}) => (
    <TextField
      size="small"
      type="number"
      label={label}
      value={value}
      onChange={(e) => onValue(e.target.value === "" ? "" : Number(e.target.value))}
      onFocus={(e) => e.target.select()}
      slotProps={{ htmlInput: { min: 0, step: "any", inputMode: "decimal", style: { textAlign: "right" } } }}
      fullWidth
      {...props}
    />
  );

  if (!items.length) {
    return (
      <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
        <ShoppingBasketIcon sx={{ fontSize: 40, opacity: 0.5 }} />
        <Typography variant="body2">{t("Tap a product to add it to the bill")}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxHeight, overflowY: maxHeight ? "auto" : undefined, mx: -0.5, px: 0.5 }}>
      {items.map((it, idx) => {
        const l = calcLine(it, interstate);
        const weight = isWeightUnit(it.unit);
        const custom = !it.product_id;
        const details = open[it.key] ?? (custom && !(Number(it.unit_price) > 0));
        const qty = Number(it.quantity) || 0;
        return (
          <Box key={it.key} sx={{ py: 1, borderTop: idx ? "1px solid" : 0, borderColor: "divider" }}>
            <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 1, rowGap: 0.5 }}>
              <Box sx={{ flex: "1 1 140px", minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.25, overflowWrap: "anywhere" }}>
                  {it.product_name || <span style={{ opacity: 0.6 }}>{t("New item")}</span>}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div">
                  {weight
                    ? `${qty ? gramsLabel(qty * gramsPerUnit(it.unit), it.unit) : t("Set weight")} × ${formatCurrency(it.unit_price)}${rateSuffix(it.unit)}`
                    : `${formatCurrency(it.unit_price)} × ${formatNumber(qty, 3)}${it.unit && it.unit !== "pcs" ? ` ${it.unit}` : ""}`}
                  {Number(it.discount_amount) > 0 && ` · −${formatCurrency(it.discount_amount)}`}
                  {it.item_note && ` · ${it.item_note}`}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto" }}>
                {weight ? (
                  <Button size="small" variant="outlined" startIcon={<ScaleIcon />} onClick={() => setLoose(it)} sx={{ whiteSpace: "nowrap", minWidth: 0 }}>
                    {qty ? gramsLabel(qty * gramsPerUnit(it.unit), it.unit) : t("Weight")}
                  </Button>
                ) : (
                  <Box sx={{ display: "flex", alignItems: "center", border: "1px solid", borderColor: "divider", borderRadius: 5 }}>
                    <IconButton size="small" onClick={() => step(it, -1)} aria-label={t("Less")}>
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                    <TextField
                      variant="standard"
                      value={it.quantity}
                      onChange={(e) => update(it.key, { quantity: e.target.value === "" ? "" : Number(e.target.value) })}
                      onFocus={(e) => e.target.select()}
                      type="number"
                      slotProps={{ input: { disableUnderline: true }, htmlInput: { min: 0, step: "any", inputMode: "decimal", style: { textAlign: "center", width: 40, padding: 0, fontWeight: 700 } } }}
                    />
                    <IconButton size="small" onClick={() => step(it, 1)} aria-label={t("More")}>
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
                <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 64, textAlign: "right", whiteSpace: "nowrap" }}>
                  {formatCurrency(l.total, { symbol: false })}
                </Typography>
                <Tooltip title={t("Details")}>
                  <IconButton size="small" onClick={() => setOpen((o) => ({ ...o, [it.key]: !details }))} color={details ? "primary" : "default"} aria-label={t("Details")}>
                    <TuneIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <IconButton size="small" color="error" onClick={() => remove(it.key)} aria-label={t("Remove")} sx={{ ml: -0.5 }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            <Collapse in={Boolean(details)} unmountOnExit>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 1, mt: 1.25 }}>
                {custom && (
                  <TextField
                    size="small"
                    label={t("Item name")}
                    value={it.product_name}
                    onChange={(e) => update(it.key, { product_name: e.target.value })}
                    autoFocus={!it.product_name}
                    sx={{ gridColumn: "1 / -1" }}
                  />
                )}
                {num(weight ? `${t("Price")} ${rateSuffix(it.unit)}` : t("Price"), it.unit_price, (v) => update(it.key, { unit_price: v }))}
                <TextField select size="small" label={t("GST %")} value={Number(it.gst_rate)} onChange={(e) => update(it.key, { gst_rate: Number(e.target.value) })}>
                  {[...new Set([...meta.gst_rates, Number(it.gst_rate)])].sort((a, b) => a - b).map((r) => (
                    <MenuItem key={r} value={r}>
                      {r}%
                    </MenuItem>
                  ))}
                </TextField>
                {showDiscount && num(t("Discount ₹"), it.discount_amount, (v) => update(it.key, { discount_amount: v }))}
                <TextField size="small" label="HSN" value={it.hsn_code || ""} onChange={(e) => update(it.key, { hsn_code: e.target.value })} />
                <TextField
                  size="small"
                  label={t("Note (prints on KOT)")}
                  value={it.item_note || ""}
                  onChange={(e) => update(it.key, { item_note: e.target.value })}
                  sx={{ gridColumn: "1 / -1" }}
                />
                <FormControlLabel
                  sx={{ gridColumn: "1 / -1", m: 0 }}
                  control={<Checkbox size="small" checked={Boolean(it.price_includes_tax)} onChange={(e) => update(it.key, { price_includes_tax: e.target.checked })} />}
                  label={<Typography variant="caption">{t("Price includes GST")}</Typography>}
                />
              </Box>
            </Collapse>
          </Box>
        );
      })}
      {loose && (
        <LooseDialog
          item={loose}
          onClose={() => setLoose(null)}
          onSave={(d) => {
            update(d.key, { quantity: d.quantity });
            setLoose(null);
          }}
        />
      )}
    </Box>
  );
}
