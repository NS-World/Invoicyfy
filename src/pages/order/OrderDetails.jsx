import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ReceiptIcon from "@mui/icons-material/Receipt";
import CheckIcon from "@mui/icons-material/CheckCircleOutline";
import CancelIcon from "@mui/icons-material/CancelOutlined";
import ReplayIcon from "@mui/icons-material/Replay";
import KitchenIcon from "@mui/icons-material/SoupKitchenOutlined";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import StatusChip from "../../components/common/StatusChip";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import GenerateInvoiceDialog from "../../components/billing/GenerateInvoiceDialog";
import PrintPortal from "../../components/print/PrintPortal";
import KotTicket from "../../components/print/KotTicket";
import { directPrint } from "../../utils/directPrint";
import useStores from "../../hooks/useStores";
import { getInvoiceSettings } from "../../utils/invoiceSettings";
import { OrderServices } from "../../services/OrderServices";
import { useNotify } from "../../context/NotifyProvider";
import { apiError, formatCurrency, formatDate, formatNumber } from "../../utils/format";
import { formatQty, rateSuffix } from "../../utils/weight";
import { useT } from "../../context/PrefsContext";

const Info = ({ label, children }) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {children || "—"}
    </Typography>
  </Box>
);

export default function OrderDetails() {
  const t = useT();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const notify = useNotify();
  const { can } = useAuth();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [params, setParams] = useSearchParams();
  const autoPrinted = useRef(false);
  const { stores } = useStores();

  const load = useCallback(async () => {
    try {
      const res = await OrderServices.getOrderDataFromId(id);
      setOrder(res.order);
      setItems(res.items || []);
    } catch (err) {
      setError(apiError(err));
    }
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  // KOT: open the print dialog once the ticket has rendered (?print=kot right after saving an order).
  useEffect(() => {
    if (order && params.get("print") === "kot" && !autoPrinted.current) {
      autoPrinted.current = true;
      setParams({}, { replace: true });
      setPrinting(true);
    }
  }, [order, params, setParams]);
  useEffect(() => {
    if (!printing) return undefined;
    let stop = false;
    const done = () => setPrinting(false);
    const timer = setTimeout(async () => {
      if (directPrint.enabled()) {
        const ok = await directPrint.printElement(document.getElementById("print-root"), localStorage.getItem("receiptWidth") || "80mm").catch(() => false);
        if (ok) return done();
      }
      if (stop) return;
      window.addEventListener("afterprint", done);
      window.print();
    }, 250);
    return () => {
      stop = true;
      clearTimeout(timer);
      window.removeEventListener("afterprint", done);
    };
  }, [printing]);

  // Old links used router state: /order-details with { order_id }
  if (!id) {
    const legacy = location.state?.order_id;
    return <Navigate to={legacy ? `/orders/${legacy}` : "/orders"} replace />;
  }
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!order) return <Loader />;

  const setStatus = async (status) => {
    setBusy(true);
    try {
      await OrderServices.updateOrderStatus({ order_id: order.order_id, status });
      notify(`Order ${status.toLowerCase()}`);
      await load();
    } catch (err) {
      notify(apiError(err), "error");
    } finally {
      setBusy(false);
      setConfirmCancel(false);
    }
  };

  const open = ["Pending", "Approved"].includes(order.status);
  const store = stores.find((s) => Number(s.store_id) === Number(order.store_id));
  const kotWidth = localStorage.getItem("receiptWidth") || "80mm";
  const interstate = Boolean(order.is_interstate);

  return (
    <>
      <PageHeader
        title={`Order ${order.order_number}`}
        subtitle={`${formatDate(order.order_date)} · ${order.order_type}`}
        back="/orders"
        actions={
          <>
            <Button variant="outlined" startIcon={<KitchenIcon />} onClick={() => setPrinting(true)}>
              {t("Print KOT")}
            </Button>
            {order.status === "Pending" && can("orders", "edit") && (
              <Button variant="outlined" color="primary" startIcon={<CheckIcon />} onClick={() => setStatus("Approved")} disabled={busy}>
                {t("Approve")}
              </Button>
            )}
            {open && can("orders", "edit") && (
              <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/order?id=${order.order_id}`)}>
                {t("Edit")}
              </Button>
            )}
            {open && can("orders", "edit") && (
              <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => setConfirmCancel(true)} disabled={busy}>
                {t("Cancel")}
              </Button>
            )}
            {order.status === "Cancelled" && can("orders", "edit") && (
              <Button variant="outlined" startIcon={<ReplayIcon />} onClick={() => setStatus("Pending")} disabled={busy}>
                {t("Re-open")}
              </Button>
            )}
            {open && can("invoices", "add") && (
              <Button variant="contained" color="success" startIcon={<ReceiptIcon />} onClick={() => setInvoiceOpen(true)}>
                {t("Generate Invoice")}
              </Button>
            )}
            {order.invoice_id && (
              <Button variant="contained" startIcon={<ReceiptIcon />} onClick={() => navigate(`/invoices/${order.invoice_id}`)}>
                View Invoice {order.invoice_number}
              </Button>
            )}
          </>
        }
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {t("Details")}
              </Typography>
              <StatusChip status={order.status} />
            </Box>
            <Info label={t("Customer")}>{order.customer_name || "Walk-in"}</Info>
            <Info label={t("Mobile")}>{order.customer_phone}</Info>
            {order.customer_gstin && <Info label={t("GSTIN")}>{order.customer_gstin}</Info>}
            <Info label={t("Store")}>{order.store_name}</Info>
            <Info label={t("Created by")}>{order.user_name}</Info>
            {order.notes && <Info label={t("Notes")}>{order.notes}</Info>}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Items ({items.length})
            </Typography>
            <TableContainer>
              <Table size="small" sx={{ minWidth: 520 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">
                      {t("Qty")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">
                      {t("Price")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">
                      {t("GST")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">
                      {t("Amount")}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.order_item_id}>
                      <TableCell>
                        {it.product_name}
                        {it.item_note && (
                          <Typography variant="caption" display="block" color="text.secondary" sx={{ fontStyle: "italic" }}>
                            {it.item_note}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {formatQty(it.quantity, it.unit)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(it.unit_price)}
                        {rateSuffix(it.unit)}
                        {Number(it.discount_amount) > 0 && (
                          <Typography variant="caption" display="block" color="success.main">
                            − {formatCurrency(it.discount_amount)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {formatNumber(it.gst_rate)}%{Number(it.price_includes_tax) ? " incl." : ""}
                      </TableCell>
                      <TableCell align="right">{formatCurrency(it.line_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ maxWidth: 320, ml: "auto", mt: 2 }}>
              {[
                ["Sub total", order.subtotal],
                order.discount_amount > 0 && ["Discount", -order.discount_amount],
                ["Taxable value", order.taxable_amount],
                [interstate ? "IGST" : "CGST + SGST", order.tax_amount],
                order.round_off !== 0 && ["Round off", order.round_off],
              ]
                .filter(Boolean)
                .map(([label, value]) => (
                  <Box key={label} sx={{ display: "flex", justifyContent: "space-between", py: 0.3 }}>
                    <Typography variant="body2" color="text.secondary">
                      {label}
                    </Typography>
                    <Typography variant="body2">{formatCurrency(value)}</Typography>
                  </Box>
                ))}
              <Box sx={{ display: "flex", justifyContent: "space-between", borderTop: 1, borderColor: "divider", pt: 1, mt: 1 }}>
                <Typography sx={{ fontWeight: 700 }}>{t("Total")}</Typography>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 800 }}>
                  {formatCurrency(order.total_amount)}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <ConfirmationDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => setStatus("Cancelled")}
        title={t("Cancel order?")}
        message="The order will be marked Cancelled. You can re-open it later."
        cancelLabel="Keep"
        confirmLabel="Cancel Order"
      />
      <GenerateInvoiceDialog order={order} open={invoiceOpen} onClose={() => setInvoiceOpen(false)} />
      {printing && (
        <PrintPortal pageSize={kotWidth}>
          <KotTicket doc={{ ...order, items, store }} width={kotWidth} settings={getInvoiceSettings(store)} />
        </PrintPortal>
      )}
    </>
  );
}
