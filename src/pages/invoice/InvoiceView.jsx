import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PaymentsIcon from "@mui/icons-material/Payments";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ShareIcon from "@mui/icons-material/Share";
import BlockIcon from "@mui/icons-material/Block";
import QrCodeIcon from "@mui/icons-material/QrCode2";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import StatusChip from "../../components/common/StatusChip";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import PaymentDialog from "../../components/billing/PaymentDialog";
import ThermalReceipt from "../../components/print/ThermalReceipt";
import TaxInvoiceA4 from "../../components/print/TaxInvoiceA4";
import PrintPortal from "../../components/print/PrintPortal";
import { InvoiceServices } from "../../services/InvoiceServices";
import { PaymentServices } from "../../services/PaymentServices";
import { useNotify } from "../../context/NotifyProvider";
import { useAuth } from "../../context/useAuth";
import { apiError, formatCurrency, formatDate } from "../../utils/format";
import { A4_TEMPLATES, RECEIPT_TEMPLATES, getInvoiceSettings } from "../../utils/invoiceSettings";

const COPY_LABELS_A4 = ["Original for Recipient", "Duplicate for Transporter", "Triplicate for Supplier", ""];
const COPY_LABELS_RECEIPT = ["", "Original", "Duplicate"];

const shareText = (inv) => {
  const s = inv.store || {};
  const lines = [
    `*${s.name}*`,
    `${inv.invoice_type === "tax" ? "Invoice" : "Bill"} No: ${inv.invoice_number}`,
    `Date: ${formatDate(inv.invoice_date)}`,
    "",
    ...inv.items.map((i) => `${i.product_name} x ${Number(i.quantity)} = ₹${Number(i.line_total).toFixed(2)}`),
    "",
    `*Total: ₹${Number(inv.total_amount).toFixed(2)}*`,
  ];
  if (inv.balance_due > 0) lines.push(`Balance due: ₹${Number(inv.balance_due).toFixed(2)}`);
  if (inv.balance_due > 0 && s.upi_id) lines.push(`Pay by UPI: ${s.upi_id}`);
  lines.push("", s.receipt_footer || "Thank you!");
  return lines.join("\n");
};

function EInvoiceDialog({ invoice, open, onClose, onSaved }) {
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) {
      setForm({
        irn: invoice.irn || "",
        ack_no: invoice.ack_no || "",
        ack_date: invoice.ack_date ? String(invoice.ack_date).replace(" ", "T").slice(0, 16) : "",
        signed_qr: invoice.signed_qr || "",
        eway_bill_no: invoice.eway_bill_no || "",
        vehicle_no: invoice.vehicle_no || "",
      });
      setError("");
    }
  }, [open, invoice]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async () => {
    setSaving(true);
    try {
      const res = await InvoiceServices.saveEInvoice({ ...form, invoice_id: invoice.invoice_id });
      onSaved(res.data);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>E-Invoice / E-Way Bill details</DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          Generate the IRN on the GST e-invoice portal (einvoice1.gst.gov.in) and paste the details here. They will print on the invoice
          with the signed QR code.
        </Alert>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField fullWidth label="IRN (64 characters)" value={form.irn || ""} onChange={set("irn")} slotProps={{ htmlInput: { maxLength: 64 } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Ack No." value={form.ack_no || ""} onChange={set("ack_no")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth type="datetime-local" label="Ack Date" value={form.ack_date || ""} onChange={set("ack_date")} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={12}>
            <TextField fullWidth multiline minRows={3} label="Signed QR code text" value={form.signed_qr || ""} onChange={set("signed_qr")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="E-way bill no." value={form.eway_bill_no || ""} onChange={set("eway_bill_no")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Vehicle no." value={form.vehicle_no || ""} onChange={set("vehicle_no")} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function InvoiceView() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const { can } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("receipt");
  const [printing, setPrinting] = useState(null);
  const [receiptWidth, setReceiptWidth] = useState(() => localStorage.getItem("receiptWidth") || "80mm");
  const [copyA4, setCopyA4] = useState(COPY_LABELS_A4[0]);
  const [copyReceipt, setCopyReceipt] = useState("");
  const [a4Tpl, setA4Tpl] = useState("");
  const [receiptTpl, setReceiptTpl] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [einvOpen, setEinvOpen] = useState(false);
  const [deletePayment, setDeletePayment] = useState(null);
  const autoPrinted = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await InvoiceServices.getInvoice(id);
      setInvoice(res.data);
      return res.data;
    } catch (err) {
      setError(apiError(err));
      return null;
    }
  }, [id]);

  useEffect(() => {
    load().then((inv) => {
      if (!inv) return;
      setPreview(inv.invoice_type === "tax" ? "a4" : "receipt");
      const st = getInvoiceSettings(inv.store);
      setA4Tpl(st.a4_template);
      setReceiptTpl(st.receipt_template);
      // A freshly created bill prints as the original; reprints are marked duplicate.
      const fresh = Date.now() - new Date(String(inv.created_at).replace(" ", "T")).getTime() < 10 * 60 * 1000;
      setCopyReceipt(fresh ? "" : "Duplicate");
    });
  }, [load]);

  const print = useCallback((kind) => setPrinting(kind), []);

  // Open the browser print dialog once the print view has rendered.
  useEffect(() => {
    if (!printing) return undefined;
    const done = () => setPrinting(null);
    window.addEventListener("afterprint", done);
    const t = setTimeout(() => window.print(), 250);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", done);
    };
  }, [printing]);

  // ?print=receipt|a4 right after creating a bill
  useEffect(() => {
    const kind = params.get("print");
    if (invoice && kind && !autoPrinted.current) {
      autoPrinted.current = true;
      setParams({}, { replace: true });
      print(kind === "a4" ? "a4" : "receipt");
    }
  }, [invoice, params, setParams, print]);

  useEffect(() => localStorage.setItem("receiptWidth", receiptWidth), [receiptWidth]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!invoice) return <Loader />;

  const cancelled = invoice.status === "Cancelled";
  const design = getInvoiceSettings(invoice.store);
  const phone = String(invoice.customer_phone || "").replace(/\D/g, "");
  const waLink = `https://api.whatsapp.com/send?phone=${phone.length === 10 ? `91${phone}` : phone}&text=${encodeURIComponent(shareText(invoice))}`;

  const share = async () => {
    const text = shareText(invoice);
    if (navigator.share) {
      try {
        await navigator.share({ title: `Invoice ${invoice.invoice_number}`, text });
      } catch {
        /* user closed the share sheet */
      }
    } else {
      await navigator.clipboard?.writeText(text);
      notify("Bill details copied to clipboard");
    }
  };

  const doCancel = async () => {
    try {
      const res = await InvoiceServices.cancelInvoice(invoice.invoice_id, cancelReason);
      notify(res.message);
      setCancelOpen(false);
      load();
    } catch (err) {
      notify(apiError(err), "error");
    }
  };

  const removePayment = async () => {
    try {
      await PaymentServices.deletePayment(deletePayment.payment_id);
      notify("Payment deleted");
      load();
    } catch (err) {
      notify(apiError(err), "error");
    }
    setDeletePayment(null);
  };

  return (
    <>
      <PageHeader
        title={`${invoice.invoice_type === "tax" ? "Tax Invoice" : "Bill"} ${invoice.invoice_number}`}
        subtitle={`${formatDate(invoice.invoice_date)} · ${invoice.customer_name || "Walk-in"}`}
        back="/invoices"
        actions={
          <>
            <Button variant="contained" startIcon={<ReceiptLongIcon />} onClick={() => print("receipt")}>
              Print Receipt
            </Button>
            <Button variant="contained" color="secondary" startIcon={<PrintIcon />} onClick={() => print("a4")}>
              Print A4 / PDF
            </Button>
          </>
        }
      />

      {cancelled && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Cancelled on {formatDate(invoice.cancelled_at)} — {invoice.cancel_reason}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }} sx={{ order: { xs: 2, md: 1 } }}>
          <Paper sx={{ p: { xs: 1, sm: 2 } }}>
            <Tabs value={preview} onChange={(_, v) => setPreview(v)} sx={{ mb: 2 }}>
              <Tab value="receipt" label="Thermal receipt" />
              <Tab value="a4" label="A4 invoice" />
            </Tabs>
            <Box sx={{ overflowX: "auto", bgcolor: "#eef1f4", p: { xs: 1, sm: 2 }, borderRadius: 2 }}>
              {preview === "receipt" ? (
                <Box sx={{ width: "fit-content", mx: "auto", boxShadow: 2 }}>
                  <ThermalReceipt invoice={invoice} copyLabel={copyReceipt} width={receiptWidth} settings={design} template={receiptTpl} />
                </Box>
              ) : (
                <Box sx={{ width: "fit-content", mx: "auto", bgcolor: "#fff", p: 1, boxShadow: 2, zoom: { xs: 0.45, sm: 0.75, lg: 0.78, xl: 1 } }}>
                  <TaxInvoiceA4 invoice={invoice} copyLabel={copyA4} settings={design} template={a4Tpl} />
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }} sx={{ order: { xs: 1, md: 2 } }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {formatCurrency(invoice.total_amount)}
              </Typography>
              <StatusChip status={invoice.status} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Received {formatCurrency(invoice.amount_paid)} · Due <b>{formatCurrency(invoice.balance_due)}</b>
            </Typography>
            {invoice.due_date && invoice.balance_due > 0 && (
              <Typography variant="caption" color={invoice.due_date < new Date().toISOString().slice(0, 10) ? "error" : "text.secondary"}>
                Due by {formatDate(invoice.due_date)}
              </Typography>
            )}
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 2 }}>
              {!cancelled && invoice.balance_due > 0 && can("payments", "add") && (
                <Button variant="contained" color="success" startIcon={<PaymentsIcon />} onClick={() => setPayOpen(true)} sx={{ gridColumn: "1 / -1" }}>
                  Record Payment
                </Button>
              )}
              <Button variant="outlined" startIcon={<WhatsAppIcon />} href={waLink} target="_blank" rel="noopener">
                WhatsApp
              </Button>
              <Button variant="outlined" startIcon={<ShareIcon />} onClick={share}>
                Share
              </Button>
              {invoice.invoice_type === "tax" && !cancelled && can("invoices", "edit") && (
                <Button variant="outlined" startIcon={<QrCodeIcon />} onClick={() => setEinvOpen(true)} sx={{ gridColumn: "1 / -1" }}>
                  {invoice.irn ? "Edit e-invoice (IRN)" : "Add e-invoice (IRN)"}
                </Button>
              )}
              {!cancelled && can("invoices", "delete") && (
                <Button variant="outlined" color="error" startIcon={<BlockIcon />} onClick={() => setCancelOpen(true)} sx={{ gridColumn: "1 / -1" }}>
                  Cancel Invoice
                </Button>
              )}
            </Box>
            {invoice.order_id && (
              <Button size="small" sx={{ mt: 1 }} onClick={() => navigate(`/orders/${invoice.order_id}`)}>
                From order {invoice.order_number}
              </Button>
            )}
          </Paper>

          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Print options
            </Typography>
            <Grid container spacing={1.5}>
              <Grid size={6}>
                <TextField select fullWidth label="Receipt width" value={receiptWidth} onChange={(e) => setReceiptWidth(e.target.value)}>
                  <MenuItem value="80mm">80 mm</MenuItem>
                  <MenuItem value="58mm">58 mm</MenuItem>
                </TextField>
              </Grid>
              <Grid size={6}>
                <TextField select fullWidth label="Receipt copy" value={copyReceipt} onChange={(e) => setCopyReceipt(e.target.value)}>
                  {COPY_LABELS_RECEIPT.map((c) => (
                    <MenuItem key={c || "none"} value={c}>
                      {c || "None"}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={6}>
                <TextField select fullWidth label="Receipt design" value={receiptTpl} onChange={(e) => setReceiptTpl(e.target.value)}>
                  {RECEIPT_TEMPLATES.map((t) => (
                    <MenuItem key={t.key} value={t.key}>
                      {t.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={6}>
                <TextField select fullWidth label="A4 design" value={a4Tpl} onChange={(e) => setA4Tpl(e.target.value)}>
                  {A4_TEMPLATES.map((t) => (
                    <MenuItem key={t.key} value={t.key}>
                      {t.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={12}>
                <TextField select fullWidth label="A4 copy label" value={copyA4} onChange={(e) => setCopyA4(e.target.value)}>
                  {COPY_LABELS_A4.map((c) => (
                    <MenuItem key={c || "none"} value={c}>
                      {c || "None"}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Tip: choose “Save as PDF” in the print dialog to download a PDF.
            </Typography>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Payments
            </Typography>
            {invoice.payments.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                No payments yet
              </Typography>
            ) : (
              <List dense disablePadding>
                {invoice.payments.map((p, i) => (
                  <Box key={p.payment_id}>
                    {i > 0 && <Divider />}
                    <ListItem
                      disableGutters
                      secondaryAction={
                        can("payments", "delete") && (
                          <Tooltip title="Delete payment">
                            <IconButton edge="end" size="small" onClick={() => setDeletePayment(p)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )
                      }
                    >
                      <ListItemText
                        primary={`${formatCurrency(p.amount)} · ${p.payment_method}`}
                        secondary={[formatDate(p.payment_date), p.reference_no, p.received_by].filter(Boolean).join(" · ")}
                      />
                    </ListItem>
                  </Box>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {printing && (
        <PrintPortal pageSize={printing === "a4" ? "A4" : receiptWidth}>
          {printing === "a4" ? (
            <TaxInvoiceA4 invoice={invoice} copyLabel={copyA4} settings={design} template={a4Tpl} />
          ) : (
            <ThermalReceipt invoice={invoice} copyLabel={copyReceipt} width={receiptWidth} settings={design} template={receiptTpl} />
          )}
        </PrintPortal>
      )}

      <PaymentDialog
        invoice={invoice}
        open={payOpen}
        onClose={() => setPayOpen(false)}
        onSaved={() => {
          setPayOpen(false);
          notify("Payment recorded");
          load();
        }}
      />
      <EInvoiceDialog
        invoice={invoice}
        open={einvOpen}
        onClose={() => setEinvOpen(false)}
        onSaved={(inv) => {
          setInvoice(inv);
          setEinvOpen(false);
          notify("E-invoice details saved");
        }}
      />
      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancel invoice {invoice.invoice_number}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Stock will be added back. The invoice number stays in the register as cancelled (required for GST).
          </Typography>
          <TextField fullWidth autoFocus label="Reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)}>Keep</Button>
          <Button color="error" variant="contained" onClick={doCancel} disabled={!cancelReason.trim()}>
            Cancel Invoice
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmationDialog
        open={Boolean(deletePayment)}
        onClose={() => setDeletePayment(null)}
        onConfirm={removePayment}
        title="Delete payment?"
        message={deletePayment ? `${formatCurrency(deletePayment.amount)} received on ${formatDate(deletePayment.payment_date)} will be removed.` : ""}
        cancelLabel="Keep"
        confirmLabel="Delete"
      />
    </>
  );
}
