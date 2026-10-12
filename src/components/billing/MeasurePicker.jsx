import { useState } from "react";
import { Box, Chip, InputAdornment, TextField, Typography } from "@mui/material";
import { useT } from "../../context/PrefsContext";
import { formatCurrency } from "../../utils/format";
import { gramsLabel, gramsPerUnit, measureUnits, parsePresets, rateSuffix } from "../../utils/weight";

const r = (n, d) => Math.round((Number(n) + Number.EPSILON) * 10 ** d) / 10 ** d;

/**
 * Loose items (ice cream by weight, milk by litre...). Three linked boxes, type in any one:
 *   grams  -> quantity and amount      e.g. 250 g at ₹400/kg = ₹100
 *   amount -> grams and quantity       e.g. ₹100 at ₹400/kg = 250 g
 *   kg     -> grams and amount         e.g. 0.25 kg = 250 g = ₹100
 * plus one-tap presets (100 g, 250 g ...). The box being typed in keeps exactly what was typed.
 */
export default function MeasurePicker({ item, onChange, autoFocus }) {
  const t = useT();
  const factor = gramsPerUnit(item.unit);
  const [small, big] = measureUnits(item.unit);
  const price = Number(item.unit_price) || 0;
  const qty = item.quantity === "" ? null : Number(item.quantity) || 0;
  const [draft, setDraft] = useState(null); // { field, text } while typing

  const base = qty === null ? "" : r(qty * factor, 2); // grams / ml
  const values = {
    base,
    big: qty === null ? "" : r((qty * factor) / 1000, 4),
    amount: qty === null ? "" : r(qty * price, 2),
  };
  const shown = (field) => (draft?.field === field ? draft.text : values[field]);

  const setQty = (q) => onChange({ quantity: q === "" ? "" : r(q, 3) });
  const type = (field) => (e) => {
    const text = e.target.value;
    setDraft({ field, text });
    const n = Number(text);
    if (text === "" || !Number.isFinite(n) || n < 0) return setQty("");
    if (field === "base") setQty(n / factor);
    else if (field === "big") setQty((n * 1000) / factor);
    else if (price > 0) setQty(n / price);
  };

  const box = (field, label, adornment, props = {}) => (
    <TextField
      type="number"
      label={label}
      value={shown(field)}
      onChange={type(field)}
      onFocus={(e) => e.target.select()}
      onBlur={() => setDraft(null)}
      slotProps={{
        htmlInput: { min: 0, step: "any", inputMode: "decimal", style: { textAlign: "right" } },
        input: adornment,
      }}
      sx={{ flex: "1 1 0", minWidth: 0 }}
      {...props}
    />
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
        {parsePresets(item.weight_presets).map((g) => {
          const on = qty !== null && Math.abs(base - g) < 0.01;
          return (
            <Chip
              key={g}
              label={gramsLabel(g, item.unit)}
              color={on ? "primary" : "default"}
              variant={on ? "filled" : "outlined"}
              onClick={() => {
                setDraft(null);
                setQty(g / factor);
              }}
              sx={{ fontWeight: 700, minWidth: 64 }}
            />
          );
        })}
      </Box>
      <Box sx={{ display: "flex", gap: 1 }}>
        {box("base", t("Weight"), { endAdornment: <InputAdornment position="end">{small}</InputAdornment> }, { autoFocus })}
        {box("amount", t("Amount"), { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, { disabled: price <= 0 })}
        {box("big", t("Qty"), { endAdornment: <InputAdornment position="end">{big}</InputAdornment> })}
      </Box>
      <Typography variant="caption" color="text.secondary">
        {qty
          ? `${gramsLabel(base, item.unit)} × ${formatCurrency(price)}${rateSuffix(item.unit)} = ${formatCurrency(values.amount)}`
          : t("Tap a size or type weight, amount or quantity")}
      </Typography>
    </Box>
  );
}
