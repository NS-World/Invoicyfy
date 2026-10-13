import { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import { useT } from "../../../context/PrefsContext";

/** A manager types their PIN on the cashier's screen to approve a bigger discount. */
export default function ApprovalPinDialog({ info, onCancel, onConfirm }) {
  const t = useT();
  const [pin, setPin] = useState("");
  const submit = () => pin.length >= 4 && onConfirm(pin);
  return (
    <Dialog open onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LockIcon color="warning" /> {t("Manager approval needed")}
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {info?.wrong
            ? t("Wrong PIN, or this person cannot approve such a big discount")
            : t("Discount {p}% is above your limit of {l}%.", { p: info?.discount_percent ?? "", l: info?.limit ?? "" })}
        </Alert>
        <TextField
          autoFocus
          fullWidth
          type="password"
          label={t("Manager PIN")}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          slotProps={{ htmlInput: { inputMode: "numeric", autoComplete: "off" } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{t("Cancel")}</Button>
        <Button variant="contained" onClick={submit} disabled={pin.length < 4}>
          {t("Approve & save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
