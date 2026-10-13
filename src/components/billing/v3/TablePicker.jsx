import { Box, Chip, Typography } from "@mui/material";
import TableRestaurantIcon from "@mui/icons-material/TableRestaurant";
import { useT } from "../../../context/PrefsContext";

/** Table buttons 1..N for dine-in (shown when the shop has tables in Counter settings). */
export default function TablePicker({ count, value, onChange, busy = [] }) {
  const t = useT();
  if (!count) return null;
  return (
    <Box data-tour="table-picker">
      <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
        <TableRestaurantIcon sx={{ fontSize: 16 }} /> {t("Table")}
      </Typography>
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", maxHeight: 92, overflowY: "auto" }}>
        <Chip size="small" label={t("None")} variant={value ? "outlined" : "filled"} color={value ? "default" : "primary"} onClick={() => onChange("")} />
        {Array.from({ length: count }, (_, i) => String(i + 1)).map((n) => (
          <Chip
            key={n}
            size="small"
            label={n}
            onClick={() => onChange(n === value ? "" : n)}
            color={n === value ? "primary" : busy.includes(n) ? "warning" : "default"}
            variant={n === value ? "filled" : "outlined"}
            sx={{ minWidth: 40, fontWeight: 700 }}
          />
        ))}
      </Box>
    </Box>
  );
}
