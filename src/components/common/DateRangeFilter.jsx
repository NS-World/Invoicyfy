import { useMemo } from "react";
import { Box, MenuItem, TextField } from "@mui/material";
import { datePresets } from "../../utils/format";

/** Preset dropdown + from/to dates. value = { from, to } */
export default function DateRangeFilter({ value, onChange }) {
  const presets = useMemo(() => datePresets(), []);
  const current = presets.find((p) => p.from === value.from && p.to === value.to)?.key || "custom";
  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
      <TextField
        select
        label="Period"
        value={current}
        onChange={(e) => {
          const p = presets.find((x) => x.key === e.target.value);
          if (p) onChange({ from: p.from, to: p.to });
        }}
        sx={{ minWidth: 170, flex: { xs: "1 1 100%", sm: "0 0 auto" } }}
      >
        {presets.map((p) => (
          <MenuItem key={p.key} value={p.key}>
            {p.label}
          </MenuItem>
        ))}
        <MenuItem value="custom" disabled>
          Custom
        </MenuItem>
      </TextField>
      <TextField
        type="date"
        label="From"
        value={value.from}
        onChange={(e) => onChange({ ...value, from: e.target.value })}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ flex: { xs: "1 1 45%", sm: "0 0 160px" } }}
      />
      <TextField
        type="date"
        label="To"
        value={value.to}
        onChange={(e) => onChange({ ...value, to: e.target.value })}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ flex: { xs: "1 1 45%", sm: "0 0 160px" } }}
      />
    </Box>
  );
}
