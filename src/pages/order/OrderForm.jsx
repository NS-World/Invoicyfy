import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, FormControlLabel, Grid, MenuItem, Paper, Switch, TextField, Typography } from "@mui/material";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import CustomerPicker from "../../components/billing/CustomerPicker";
import ProductCatalog from "../../components/billing/ProductCatalog";
import BillCart from "../../components/billing/BillCart";
import useBillPicker from "../../components/billing/useBillPicker";
import useCatalog from "../../hooks/useCatalog";
import { billLines } from "../../utils/billItems";
import { getInvoiceSettings } from "../../utils/invoiceSettings";
import TablePicker from "../../components/billing/v3/TablePicker";
import ApprovalPinDialog from "../../components/billing/v3/ApprovalPinDialog";
import { PosServices } from "../../services/V3Services";
import TotalsSummary from "../../components/billing/TotalsSummary";
import { OrderServices } from "../../services/OrderServices";
import { CustomerServices } from "../../services/CustomerServices";
import { useNotify } from "../../context/NotifyProvider";
import { useAuth } from "../../context/useAuth";
import useMeta from "../../hooks/useMeta";
import useStores from "../../hooks/useStores";
import { apiError, formatCurrency, today } from "../../utils/format";
import { calcTotals, itemFromApi, itemToApi } from "../../utils/gst";
import { isInterstate } from "../../utils/party";
import { useT } from "../../context/PrefsContext";

export default function OrderForm() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const notify = useNotify();
  const meta = useMeta();
  const { isAdmin } = useAuth();
  const { stores, defaultStoreId } = useStores();

  const orderId = params.get("id") || location.state?.productData?.order_id || location.state?.order_id || null;

  const [loading, setLoading] = useState(Boolean(orderId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [storeId, setStoreId] = useState("");
  const [party, setParty] = useState({ customer: null, customer_name: "", customer_phone: "" });
  const [orderDate, setOrderDate] = useState(today());
  const [orderType, setOrderType] = useState("Counter");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([]);
  const [kot, setKot] = useState(null); // null = shop default (new orders only)
  const cartRef = useRef(null);
  const [orderNumber, setOrderNumber] = useState("");

  useEffect(() => {
    if (!storeId && defaultStoreId) setStoreId(defaultStoreId);
  }, [defaultStoreId, storeId]);

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      try {
        const res = await OrderServices.getOrderDataFromId(orderId);
        const o = res.order;
        if (["Invoiced", "Cancelled"].includes(o.status)) {
          notify(`This order is ${o.status} and cannot be edited`, "warning");
          navigate(`/orders/${orderId}`, { replace: true });
          return;
        }
        let customer = null;
        if (o.customer_id) {
          customer = (await CustomerServices.getCustomerDataFromId(o.customer_id)).data;
        }
        setParty({ customer, customer_name: o.customer_name || "", customer_phone: o.customer_phone || "" });
        setStoreId(o.store_id);
        setOrderDate(o.order_date || today());
        setOrderType(o.order_type || "Counter");
        setTableNo(o.table_no || "");
        setNotes(o.notes || "");
        setOrderNumber(o.order_number);
        setItems(res.items.map(itemFromApi));
      } catch (err) {
        setError(apiError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId, navigate, notify]);

  const store = stores.find((s) => String(s.store_id) === String(storeId));
  const interstate = isInterstate(store, party.customer);
  const catalog = useCatalog(storeId);
  const { pick, addCustom, dialog } = useBillPicker(setItems);
  const kotOn = kot ?? (!orderId && getInvoiceSettings(store).kot_auto_order);
  const [tableNo, setTableNo] = useState("");
  const [pos, setPos] = useState(null);
  const [approval, setApproval] = useState(null);
  useEffect(() => {
    if (!storeId) return;
    PosServices.get(storeId)
      .then((r) => setPos(r.data))
      .catch(() => {});
  }, [storeId]);
  const validItems = billLines(items);
  const totals = useMemo(() => calcTotals(validItems, interstate), [validItems, interstate]);

  const send = async (payload) => {
    setSaving(true);
    setError("");
    try {
      const res = orderId ? await OrderServices.updateOrderData(payload) : await OrderServices.postOrderData(payload);
      notify(orderId ? "Order updated" : `Order ${res.order_number} created`);
      navigate(`/orders/${orderId || res.order_id}${kotOn ? "?print=kot" : ""}`);
    } catch (err) {
      const data = err?.response?.data || {};
      if (data.code === "approval_required" || data.code === "approval_wrong_pin") setApproval({ info: { ...data, wrong: data.code === "approval_wrong_pin" }, payload });
      else setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validItems.length) {
      setError(t("Add at least one item"));
      return;
    }
    await send({
      order_id: orderId || undefined,
      store_id: storeId,
      customer_id: party.customer?.customer_id || null,
      customer_name: party.customer ? undefined : party.customer_name,
      customer_phone: party.customer ? undefined : party.customer_phone,
      order_date: orderDate,
      order_type: orderType,
      table_no: tableNo,
      notes,
      items: validItems.map(itemToApi),
    });
  };

  if (loading) return <Loader />;

  return (
    <Box component="form" onSubmit={submit}>
      <PageHeader title={orderId ? `Edit Order ${orderNumber}` : "New Order"} back="/orders" />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
            <Grid container spacing={2}>
              <Grid size={12}>
                <CustomerPicker value={party} onChange={setParty} />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField fullWidth type="date" label={t("Order date")} value={orderDate} onChange={(e) => setOrderDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField select fullWidth label={t("Order type")} value={orderType} onChange={(e) => setOrderType(e.target.value)}>
                  {meta.order_types.map((ot) => (
                    <MenuItem key={ot} value={ot}>
                      {t(ot)}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              {pos?.table_count > 0 && (
                <Grid size={12}>
                  <TablePicker
                    count={pos.table_count}
                    value={tableNo}
                    onChange={(n) => {
                      setTableNo(n);
                      if (n) setOrderType("Dine-in");
                    }}
                  />
                </Grid>
              )}
              {isAdmin && stores.length > 1 && (
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField select fullWidth label={t("Store")} value={storeId} onChange={(e) => setStoreId(e.target.value)} disabled={Boolean(orderId)}>
                    {stores.map((s) => (
                      <MenuItem key={s.store_id} value={s.store_id}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}
            </Grid>
          </Paper>

          <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
            <ProductCatalog catalog={catalog} items={items} onPick={pick} onCustom={addCustom} />
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Box sx={{ position: { lg: "sticky" }, top: { lg: 16 } }}>
            <Paper ref={cartRef} sx={{ p: 2, mb: 2, scrollMarginTop: 72 }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
                  {t("Order items")} {validItems.length > 0 && `(${validItems.length})`}
                </Typography>
                {items.length > 0 && (
                  <Button size="small" color="inherit" onClick={() => setItems([])}>
                    {t("Clear")}
                  </Button>
                )}
              </Box>
              <BillCart items={items} onChange={setItems} interstate={interstate} maxHeight={{ lg: "40vh" }} />
            </Paper>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {t("Summary")}
              </Typography>
              {interstate && (
                <Alert severity="info" sx={{ mb: 1 }}>
                  {t("Inter-state supply — IGST applies")}
                </Alert>
              )}
              <TotalsSummary t={totals} interstate={interstate} />
              <TextField fullWidth multiline minRows={1} label={t("Notes (prints on KOT)")} value={notes} onChange={(e) => setNotes(e.target.value)} sx={{ mt: 2 }} />
              <FormControlLabel
                sx={{ mt: 1 }}
                control={<Switch checked={Boolean(kotOn)} onChange={(e) => setKot(e.target.checked)} />}
                label={orderId ? t("Print updated KOT (kitchen copy)") : t("Print KOT for kitchen")}
              />
              <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                <Button variant="outlined" fullWidth onClick={() => navigate("/orders")}>
                  {t("Cancel")}
                </Button>
                <Button type="submit" variant="contained" fullWidth disabled={saving || !validItems.length}>
                  {saving ? t("Saving...") : orderId ? t("Update Order") : t("Create Order")}
                </Button>
              </Box>
          </Paper>
          </Box>
        </Grid>
      </Grid>
      {dialog}
      {approval && (
        <ApprovalPinDialog
          info={approval.info}
          onCancel={() => setApproval(null)}
          onConfirm={(pin) => {
            const payload = { ...approval.payload, approval_pin: pin };
            setApproval(null);
            send(payload);
          }}
        />
      )}
      <Paper
        elevation={8}
        sx={{ display: { xs: validItems.length ? "flex" : "none", lg: "none" }, position: "sticky", bottom: 8, mt: 2, p: 1, pl: 2, gap: 1, alignItems: "center", zIndex: 5, borderRadius: 3 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" component="div">
            {t("{n} item(s)", { n: validItems.length })}
          </Typography>
          <Typography sx={{ fontWeight: 800 }}>{formatCurrency(totals.total)}</Typography>
        </Box>
        <Button variant="outlined" onClick={() => cartRef.current?.scrollIntoView({ behavior: "smooth" })}>
          {t("View order")}
        </Button>
        <Button type="submit" variant="contained" disabled={saving}>
          {t("Save")}
        </Button>
      </Paper>
    </Box>
  );
}
