import { useCallback, useEffect, useState } from "react";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { SupplierServices, PurchaseServices } from "../../services/V4Services";
import { useAuth } from "../../context/useAuth";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { apiError, formatCurrency, formatDate, formatNumber } from "../../utils/format";
import SupplierPayDialog from "../supplier/SupplierPayDialog";

/** One purchase bill: items, GST, payments; pay the balance, edit bill no. / dates, or cancel. */
export default function PurchaseView({ purchaseId, onClose, onChanged }) {
  const t = useT();
  const notify = useNotify();
  const { can } = useAuth();
  const [p, setP] = useState(null);
  const [edit, setEdit] = useState(null);
  const [cancel, setCancel] = useState(null);
  const [pay, setPay] = useState(null);

  const load = useCallback(() => {
    PurchaseServices.get(purchaseId)
      .then((r) => setP(r.data))
      .catch((e) => notify(apiError(e), "error"));
  }, [purchaseId, notify]);
  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn) => {
    try {
      const res = await fn();
      notify(t(res.message));
      setEdit(null);
      setCancel(null);
      load();
      onChanged?.();
    } catch (e) {
      notify(apiError(e), "error");
    }
  };
  const openPay = async () => {
    try {
      const r = await SupplierServices.get(p.supplier_id);
      setPay(r.data);
    } catch (e) {
      notify(apiError(e), "error");
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        {t("Purchase bill")} {p?.bill_no || (p ? `#${p.purchase_id}` : "")}
        {p && <Chip size="small" label={t(p.status)} color={p.status === "Paid" ? "success" : p.status === "Cancelled" ? "default" : "warning"} />}
      </DialogTitle>
      <DialogContent dividers>
        {p && (
          <>
            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography sx={{ fontWeight: 700 }}>{p.supplier_name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {[p.supplier_gstin, p.supplier_phone].filter(Boolean).join(" · ")}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} sx={{ textAlign: { sm: "right" } }}>
                <Typography variant="body2">
                  {t("Bill date")}: {formatDate(p.purchase_date)}
                  {p.due_date ? ` · ${t("Pay by")} ${formatDate(p.due_date)}` : ""}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("Entered by")} {p.user_name || "—"}
                </Typography>
              </Grid>
            </Grid>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t("Item")}</TableCell>
                    <TableCell align="right">{t("Qty")}</TableCell>
                    <TableCell align="right">{t("Rate")}</TableCell>
                    <TableCell align="right">{t("GST")}</TableCell>
                    <TableCell>{t("Batch / expiry")}</TableCell>
                    <TableCell align="right">{t("Amount")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {p.items.map((it) => (
                    <TableRow key={it.purchase_item_id}>
                      <TableCell>{it.product_name}</TableCell>
                      <TableCell align="right">
                        {formatNumber(it.quantity, 3)} {it.unit}
                      </TableCell>
                      <TableCell align="right">{formatCurrency(it.unit_cost)}</TableCell>
                      <TableCell align="right">
                        {it.gst_rate}% · {formatCurrency(it.tax_amount)}
                      </TableCell>
                      <TableCell>{[it.batch_no, it.expiry_date ? formatDate(it.expiry_date) : null].filter(Boolean).join(" · ") || "—"}</TableCell>
                      <TableCell align="right">{formatCurrency(it.line_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Box sx={{ ml: "auto", maxWidth: 320, mt: 2 }}>
              {[
                ["Taxable value", p.taxable_amount],
                [p.igst_amount > 0 ? "IGST" : "CGST + SGST", p.tax_amount],
                ["Other charges", p.other_charges],
                ["Round off", p.round_off],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <Box key={k} sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary">
                      {t(k)}
                    </Typography>
                    <Typography variant="body2">{formatCurrency(v)}</Typography>
                  </Box>
                ))}
              <Divider sx={{ my: 0.5 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography sx={{ fontWeight: 800 }}>{t("Total")}</Typography>
                <Typography sx={{ fontWeight: 800 }}>{formatCurrency(p.total_amount)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">{t("Paid")}</Typography>
                <Typography variant="body2">{formatCurrency(p.amount_paid)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {t("Balance")}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: p.balance_due > 0 ? "error.main" : "success.main" }}>
                  {formatCurrency(p.balance_due)}
                </Typography>
              </Box>
            </Box>
            {p.payments.length > 0 && (
              <>
                <Typography sx={{ fontWeight: 700, mt: 2 }}>{t("Payments")}</Typography>
                {p.payments.map((pm) => (
                  <Typography key={pm.payment_id} variant="body2" color="text.secondary">
                    {formatDate(pm.payment_date)} · {t(pm.payment_method)} · {formatCurrency(pm.amount)}
                    {pm.reference_no ? ` · ${pm.reference_no}` : ""}
                  </Typography>
                ))}
              </>
            )}
            {p.notes && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {t("Notes")}: {p.notes}
              </Typography>
            )}
            {p.status === "Cancelled" && (
              <Typography color="error" sx={{ mt: 1 }}>
                {t("Cancelled")}: {p.cancel_reason}
              </Typography>
            )}
            {edit && (
              <Grid container spacing={1.5} sx={{ mt: 2 }}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField fullWidth size="small" label={t("Supplier bill no.")} value={edit.bill_no || ""} onChange={(e) => setEdit({ ...edit, bill_no: e.target.value })} />
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <TextField fullWidth size="small" type="date" label={t("Bill date")} value={edit.purchase_date} onChange={(e) => setEdit({ ...edit, purchase_date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <TextField fullWidth size="small" type="date" label={t("Pay by")} value={edit.due_date || ""} onChange={(e) => setEdit({ ...edit, due_date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
                </Grid>
                <Grid size={12}>
                  <TextField fullWidth size="small" label={t("Notes")} value={edit.notes || ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
                </Grid>
                <Grid size={12}>
                  <Button variant="contained" onClick={() => run(() => PurchaseServices.update({ ...edit, purchase_id: p.purchase_id, due_date: edit.due_date || null }))}>
                    {t("Save changes")}
                  </Button>
                  <Button onClick={() => setEdit(null)}>{t("Cancel")}</Button>
                </Grid>
              </Grid>
            )}
            {cancel !== null && (
              <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
                <TextField size="small" sx={{ flex: 1, minWidth: 220 }} autoFocus label={t("Reason for cancelling")} value={cancel} onChange={(e) => setCancel(e.target.value)} />
                <Button color="error" variant="contained" disabled={!cancel.trim()} onClick={() => run(() => PurchaseServices.cancel(p.purchase_id, cancel))}>
                  {t("Cancel bill")}
                </Button>
                <Button onClick={() => setCancel(null)}>{t("Back")}</Button>
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        {p && p.status !== "Cancelled" && (
          <>
            {can("purchases", "delete") && cancel === null && (
              <Button color="error" onClick={() => setCancel("")}>
                {t("Cancel bill")}
              </Button>
            )}
            {can("purchases", "edit") && !edit && (
              <Button onClick={() => setEdit({ bill_no: p.bill_no, purchase_date: p.purchase_date, due_date: p.due_date, notes: p.notes })}>{t("Edit")}</Button>
            )}
            {can("purchases", "add") && p.balance_due > 0 && (
              <Button variant="contained" onClick={openPay}>
                {t("Pay balance")}
              </Button>
            )}
          </>
        )}
        <Button onClick={onClose}>{t("Close")}</Button>
      </DialogActions>
      {pay && (
        <SupplierPayDialog
          supplier={pay}
          purchase={p}
          onClose={() => setPay(null)}
          onSaved={(res) => {
            setPay(null);
            notify(t(res.message));
            load();
            onChanged?.();
          }}
        />
      )}
    </Dialog>
  );
}
