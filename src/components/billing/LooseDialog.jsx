import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography, useMediaQuery, useTheme } from "@mui/material";
import { useT } from "../../context/PrefsContext";
import { formatCurrency } from "../../utils/format";
import { rateSuffix } from "../../utils/weight";
import MeasurePicker from "./MeasurePicker";

/** Weight / amount / quantity for one loose line (new or being changed). */
export default function LooseDialog({ item, onSave, onClose }) {
  const t = useT();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const [draft, setDraft] = useState(item);
  const ok = Number(draft.quantity) > 0;
  const save = () => ok && onSave(draft);

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      // On phones the box sits at the bottom, close to the thumb and above the keyboard.
      sx={phone ? { "& .MuiDialog-container": { alignItems: "flex-end" }, "& .MuiDialog-paper": { m: 0, width: "100%", borderRadius: "16px 16px 0 0" } } : undefined}
    >
      <DialogTitle sx={{ pb: 0.5 }}>
        {draft.product_name}
        <Typography variant="body2" color="text.secondary">
          {formatCurrency(draft.unit_price)}
          {rateSuffix(draft.unit)}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: "12px !important" }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <MeasurePicker
            item={draft}
            onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
            onPreset={(quantity) => onSave({ ...draft, quantity })}
            autoFocus={!phone}
          />
          <button type="submit" hidden />
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("Cancel")}</Button>
        <Button variant="contained" onClick={save} disabled={!ok}>
          {item.quantity === "" ? t("Add to bill") : t("Update")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
