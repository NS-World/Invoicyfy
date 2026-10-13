import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import { QRCodeSVG } from "qrcode.react";
import { useT } from "../../../context/PrefsContext";
import { formatCurrency } from "../../../utils/format";
import { paymentAmounts, upiLink } from "../../../utils/payments";

function UpiQrDialog({ upi, amount, onClose }) {
  const t = useT();
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ textAlign: "center" }}>{t("Scan & pay with any UPI app")}</DialogTitle>
      <DialogContent sx={{ textAlign: "center" }}>
        <Box sx={{ display: "inline-block", p: 1.5, bgcolor: "#fff", borderRadius: 2, boxShadow: 2 }}>
          <QRCodeSVG value={upiLink(upi, amount)} size={240} level="M" />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mt: 1.5 }}>
          {formatCurrency(amount)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {upi.payee_name} · {upi.upi_id}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
          {t("Check the payment on your phone / soundbox before saving the bill.")}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" fullWidth onClick={onClose}>
          {t("Done")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Payment received at the counter: one mode, or split (e.g. ₹200 cash + ₹150 UPI).
 * UPI shows a QR with the exact amount when the shop's UPI ID is set.
 * rows: [{ method, amount: "" (= rest of the bill) | number, reference }]
 */
export default function PaymentBox({ total, paid, onPaid, rows, onRows, methods, upi }) {
  const t = useT();
  const [qr, setQr] = useState(null);
  const [given, setGiven] = useState("");
  const amounts = paymentAmounts(rows, total);
  const sum = amounts.reduce((s, a) => s + a, 0);
  const balance = Math.round((total - sum) * 100) / 100;
  const update = (i, patch) => onRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const single = rows.length === 1;
  const canQr = upi?.upi_qr_on_screen && upi?.upi_id;

  return (
    <Box sx={{ mt: 2, p: 1.5, bgcolor: "action.hover", borderRadius: 2 }} data-tour="payment-box">
      <FormControlLabel control={<Switch checked={paid} onChange={(e) => onPaid(e.target.checked)} />} label={t("Payment received")} />
      {paid && (
        <>
          {rows.map((r, i) => (
            <Box key={i} sx={{ display: "flex", gap: 1, mt: 1, alignItems: "flex-start", flexWrap: "wrap" }}>
              <TextField
                select
                size="small"
                label={t("Mode")}
                value={r.method}
                onChange={(e) => update(i, { method: e.target.value })}
                sx={{ flex: "1 1 110px", minWidth: 0 }}
              >
                {methods.filter((m) => m !== "Credit").map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                type="number"
                label={t("Amount ₹")}
                value={i === 0 && r.amount === "" ? amounts[0] : r.amount}
                onChange={(e) => update(i, { amount: e.target.value })}
                onFocus={(e) => e.target.select()}
                slotProps={{ htmlInput: { min: 0, step: "any", inputMode: "decimal" } }}
                sx={{ flex: "1 1 100px", minWidth: 0 }}
              />
              {r.method === "UPI" && canQr && (
                <Tooltip title={t("Show UPI QR")}>
                  <IconButton color="primary" onClick={() => setQr(amounts[i])} aria-label={t("Show UPI QR")} sx={{ border: 1, borderColor: "divider" }}>
                    <QrCode2Icon />
                  </IconButton>
                </Tooltip>
              )}
              {i > 0 && (
                <IconButton onClick={() => onRows(rows.filter((_, j) => j !== i))} aria-label={t("Remove")}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
              {r.method !== "Cash" && (
                <TextField
                  size="small"
                  label={t("Reference / UTR")}
                  value={r.reference || ""}
                  onChange={(e) => update(i, { reference: e.target.value })}
                  sx={{ flex: "1 1 100%" }}
                />
              )}
            </Box>
          ))}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", mt: 0.5, gap: 1 }}>
            {rows.length < 6 && (
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => {
                  // The new row takes what is left; the first row keeps its current amount.
                  const fixed = rows.map((r, i) => (i === 0 ? { ...r, amount: amounts[0] } : r));
                  onRows([...fixed, { method: rows.some((r) => r.method === "UPI") ? "Cash" : "UPI", amount: Math.max(0, balance), reference: "" }]);
                }}
                data-tour="split-btn"
              >
                {t("Split payment")}
              </Button>
            )}
            {balance > 0.009 && (
              <Typography variant="caption" color="warning.main">
                {t("Balance {amount} will stay due", { amount: formatCurrency(balance) })}
              </Typography>
            )}
            {balance < -0.009 && (
              <Typography variant="caption" color="error.main">
                {t("Payments are more than the bill by {amount}", { amount: formatCurrency(-balance) })}
              </Typography>
            )}
          </Box>
          {single && rows[0].method === "Cash" && total > 0 && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
              <TextField
                size="small"
                type="number"
                label={t("Customer gave ₹")}
                value={given}
                onChange={(e) => setGiven(e.target.value)}
                slotProps={{ htmlInput: { min: 0, step: "any", inputMode: "decimal" } }}
                sx={{ width: 150 }}
              />
              {Number(given) > 0 && (
                <Typography sx={{ fontWeight: 700, color: Number(given) >= amounts[0] ? "success.main" : "warning.main" }}>
                  {Number(given) >= amounts[0] ? `${t("Return")} ${formatCurrency(Number(given) - amounts[0])}` : `${t("Short")} ${formatCurrency(amounts[0] - Number(given))}`}
                </Typography>
              )}
            </Box>
          )}
        </>
      )}
      {qr !== null && <UpiQrDialog upi={upi} amount={qr} onClose={() => setQr(null)} />}
    </Box>
  );
}
