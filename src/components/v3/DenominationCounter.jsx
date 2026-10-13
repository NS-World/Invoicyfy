import { Box, TextField, Typography } from "@mui/material";
import { useT } from "../../context/PrefsContext";
import { formatCurrency } from "../../utils/format";
import { NOTES, denomTotal } from "../../utils/cash";


/** Count the drawer note by note: ₹500 × 3 = ₹1,500 ... with the running total. */
export default function DenominationCounter({ value, onChange }) {
  const t = useT();
  const set = (note, v) => onChange({ ...value, [note]: v === "" ? "" : Math.max(0, Math.floor(Number(v) || 0)) });
  return (
    <Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(5, minmax(0, 1fr))" }, gap: 1 }}>
        {NOTES.map((note) => (
          <TextField
            key={note}
            size="small"
            type="number"
            label={`₹${note} ×`}
            value={value?.[note] ?? ""}
            onChange={(e) => set(note, e.target.value)}
            onFocus={(e) => e.target.select()}
            slotProps={{ htmlInput: { min: 0, step: 1, inputMode: "numeric" } }}
            helperText={Number(value?.[note]) > 0 ? formatCurrency(note * Number(value[note])) : " "}
          />
        ))}
      </Box>
      <Typography sx={{ mt: 0.5, fontWeight: 700 }}>
        {t("Counted")}: {formatCurrency(denomTotal(value))}
      </Typography>
    </Box>
  );
}
