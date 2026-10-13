import { MenuItem, TextField } from "@mui/material";
import useStores from "../../hooks/useStores";
import { useAuth } from "../../context/useAuth";
import { useT } from "../../context/PrefsContext";

/** Store dropdown, shown only to an Admin who has more than one store. */
export default function StorePicker({ value, onChange, sx }) {
  const t = useT();
  const { isAdmin } = useAuth();
  const { stores } = useStores();
  if (!isAdmin || stores.length < 2) return null;
  return (
    <TextField select size="small" label={t("Store")} value={value || ""} onChange={(e) => onChange(e.target.value)} sx={{ minWidth: 180, ...sx }}>
      {stores.map((s) => (
        <MenuItem key={s.store_id} value={s.store_id}>
          {s.name}
        </MenuItem>
      ))}
    </TextField>
  );
}
