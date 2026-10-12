import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { InvoiceServices } from "../../services/InvoiceServices";
import useMeta from "../../hooks/useMeta";
import { apiError, formatCurrency } from "../../utils/format";
import { useT } from "../../context/PrefsContext";

/** Turn an order into a retail bill (thermal receipt) or a GST tax invoice (A4, B2B). */
export default function GenerateInvoiceDialog({ order, open, onClose, onDone }) {
  const t = useT();
  const navigate = useNavigate();
  const meta = useMeta();
  const [type, setType] = useState("retail");
  const [paid, setPaid] = useState(true);
  const [method, setMethod] = useState("Cash");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && order) {
      const b2b = order.customer_type === "B2B" || Boolean(order.customer_gstin) || order.order_type === "B2B";
      setType(b2b ? "tax" : "retail");
      setPaid(!b2b);
      setError("");
    }
  }, [open, order]);

  if (!order) return null;

  const create = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await InvoiceServices.createInvoice({
        order_id: order.order_id,
        invoice_type: type,
        due_date: !paid && dueDate ? dueDate : undefined,
        payment: paid ? { amount: order.total_amount, payment_method: method } : undefined,
      });
      onDone?.(res);
      navigate(`/invoices/${res.invoice_id}?print=${type === "retail" ? "receipt" : "a4"}`);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Generate Invoice · {order.order_number}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography variant="body2" color="text.secondary">
          {order.customer_name || "Walk-in"} · Total <b>{formatCurrency(order.total_amount)}</b>
        </Typography>
        <RadioGroup value={type} onChange={(e) => setType(e.target.value)} sx={{ mt: 1.5 }}>
          <FormControlLabel value="retail" control={<Radio />} label={<Box><b>{t("Retail bill")}</b><Typography variant="caption" display="block" color="text.secondary">{t("Thermal receipt for counter / delivery customers")}</Typography></Box>} />
          <FormControlLabel value="tax" control={<Radio />} label={<Box><b>{t("GST tax invoice")}</b><Typography variant="caption" display="block" color="text.secondary">{t("A4 pakka bill with GSTIN, HSN and CGST/SGST/IGST for B2B")}</Typography></Box>} />
        </RadioGroup>
        <FormControlLabel sx={{ mt: 1 }} control={<Switch checked={paid} onChange={(e) => setPaid(e.target.checked)} />} label={t("Payment received now")} />
        {paid ? (
          <TextField select fullWidth label={t("Payment mode")} value={method} onChange={(e) => setMethod(e.target.value)} sx={{ mt: 1 }}>
            {meta.payment_methods.filter((m) => m !== "Credit").map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <TextField fullWidth type="date" label={t("Due date (optional)")} value={dueDate} onChange={(e) => setDueDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ mt: 1 }} />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("Cancel")}</Button>
        <Button variant="contained" onClick={create} disabled={saving}>
          {saving ? "Creating..." : "Create & Print"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
