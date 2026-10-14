import { useCallback, useEffect, useState } from "react";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, Tooltip, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import StatCard from "../../components/common/StatCard";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import { SupplierServices } from "../../services/V4Services";
import { useAuth } from "../../context/useAuth";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { apiError, formatCurrency, formatDate } from "../../utils/format";
import SupplierPayDialog from "./SupplierPayDialog";

/** Supplier ledger: purchase bills and payments, with the balance we owe. */
export default function SupplierStatement({ supplierId, onClose, onChanged }) {
  const t = useT();
  const notify = useNotify();
  const { can } = useAuth();
  const [s, setS] = useState(null);
  const [pay, setPay] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(() => {
    SupplierServices.get(supplierId)
      .then((r) => setS(r.data))
      .catch((e) => notify(apiError(e), "error"));
  }, [supplierId, notify]);
  useEffect(() => {
    load();
  }, [load]);

  const removePayment = async () => {
    try {
      const res = await SupplierServices.removePayment(toDelete.id);
      notify(t(res.message));
      load();
      onChanged?.();
    } catch (e) {
      notify(apiError(e), "error");
    }
    setToDelete(null);
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{s ? s.name : t("Supplier")}</DialogTitle>
      <DialogContent dividers>
        {s && (
          <>
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatCard label="Opening balance" value={formatCurrency(s.opening_balance)} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatCard label="Purchased" value={formatCurrency(s.purchased)} hint={`${s.bills} ${t("bills")}`} />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatCard label="Paid" value={formatCurrency(s.paid)} color="success.main" />
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StatCard label={s.balance >= 0 ? "We owe" : "Advance paid"} value={formatCurrency(Math.abs(s.balance))} color={s.balance > 0 ? "error.main" : "success.main"} />
              </Grid>
            </Grid>
            {s.entries.length === 0 && <Typography color="text.secondary">{t("No bills or payments yet")}</Typography>}
            {s.entries.map((e) => (
              <Box key={`${e.type}-${e.id}`} sx={{ display: "flex", alignItems: "center", gap: 1, py: 1, borderTop: 1, borderColor: "divider" }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {e.type === "bill" ? `${t("Purchase bill")} ${e.reference || ""}` : `${t("Payment")} · ${t(e.payment_method)}${e.reference ? ` · ${e.reference}` : ""}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(e.date)}
                    {e.type === "payment" && e.bill_no ? ` · ${t("for bill")} ${e.bill_no}` : ""}
                    {e.notes ? ` · ${e.notes}` : ""}
                  </Typography>
                </Box>
                {e.type === "bill" && <Chip size="small" label={t(e.status)} color={e.status === "Paid" ? "success" : e.status === "Cancelled" ? "default" : "warning"} />}
                <Typography sx={{ fontWeight: 700, minWidth: 100, textAlign: "right", color: e.type === "payment" ? "success.main" : "text.primary", textDecoration: e.status === "Cancelled" ? "line-through" : "none" }}>
                  {e.type === "payment" ? "−" : "+"}
                  {formatCurrency(e.amount)}
                </Typography>
                {e.type === "payment" && can("purchases", "delete") ? (
                  <Tooltip title={t("Delete payment")}>
                    <IconButton size="small" color="error" onClick={() => setToDelete(e)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Box sx={{ width: 34 }} />
                )}
              </Box>
            ))}
          </>
        )}
      </DialogContent>
      <DialogActions>
        {s && can("purchases", "add") && (
          <Button variant="contained" onClick={() => setPay(true)}>
            {t("Pay supplier")}
          </Button>
        )}
        <Button onClick={onClose}>{t("Close")}</Button>
      </DialogActions>
      {pay && (
        <SupplierPayDialog
          supplier={s}
          onClose={() => setPay(false)}
          onSaved={(res) => {
            setPay(false);
            notify(t(res.message));
            load();
            onChanged?.();
          }}
        />
      )}
      <ConfirmationDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={removePayment}
        title={t("Delete payment?")}
        message={toDelete ? `${formatDate(toDelete.date)} · ${formatCurrency(toDelete.amount)}` : ""}
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
    </Dialog>
  );
}
