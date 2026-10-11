import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Grid, MenuItem, Paper, TextField, Typography } from "@mui/material";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import CustomerPicker from "../../components/billing/CustomerPicker";
import ItemsEditor from "../../components/billing/ItemsEditor";
import TotalsSummary from "../../components/billing/TotalsSummary";
import { OrderServices } from "../../services/OrderServices";
import { CustomerServices } from "../../services/CustomerServices";
import { useNotify } from "../../context/NotifyProvider";
import { useAuth } from "../../context/useAuth";
import useMeta from "../../hooks/useMeta";
import useStores from "../../hooks/useStores";
import { apiError, today } from "../../utils/format";
import { calcTotals, emptyItem, itemFromApi, itemToApi } from "../../utils/gst";
import { isInterstate } from "../../utils/party";

export default function OrderForm() {
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
  const [items, setItems] = useState([emptyItem()]);
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
        setNotes(o.notes || "");
        setOrderNumber(o.order_number);
        setItems(res.items.length ? res.items.map(itemFromApi) : [emptyItem()]);
      } catch (err) {
        setError(apiError(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId, navigate, notify]);

  const store = stores.find((s) => String(s.store_id) === String(storeId));
  const interstate = isInterstate(store, party.customer);
  const validItems = items.filter((i) => i.product_name && Number(i.quantity) > 0);
  const totals = useMemo(() => calcTotals(validItems, interstate), [validItems, interstate]);

  const submit = async (e) => {
    e.preventDefault();
    if (!validItems.length) {
      setError("Add at least one item");
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      order_id: orderId || undefined,
      store_id: storeId,
      customer_id: party.customer?.customer_id || null,
      customer_name: party.customer ? undefined : party.customer_name,
      customer_phone: party.customer ? undefined : party.customer_phone,
      order_date: orderDate,
      order_type: orderType,
      notes,
      items: validItems.map(itemToApi),
    };
    try {
      const res = orderId ? await OrderServices.updateOrderData(payload) : await OrderServices.postOrderData(payload);
      notify(orderId ? "Order updated" : `Order ${res.order_number} created`);
      navigate(`/orders/${orderId || res.order_id}`);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
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
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
            <Grid container spacing={2}>
              <Grid size={12}>
                <CustomerPicker value={party} onChange={setParty} />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField fullWidth type="date" label="Order date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField select fullWidth label="Order type" value={orderType} onChange={(e) => setOrderType(e.target.value)}>
                  {meta.order_types.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              {isAdmin && stores.length > 1 && (
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField select fullWidth label="Store" value={storeId} onChange={(e) => setStoreId(e.target.value)} disabled={Boolean(orderId)}>
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
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
              Items
            </Typography>
            <ItemsEditor items={items} onChange={setItems} interstate={interstate} storeId={storeId} />
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 2, position: { lg: "sticky" }, top: { lg: 16 } }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Summary
            </Typography>
            {interstate && (
              <Alert severity="info" sx={{ mb: 1 }}>
                Inter-state supply — IGST applies
              </Alert>
            )}
            <TotalsSummary t={totals} interstate={interstate} />
            <TextField fullWidth multiline minRows={2} label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} sx={{ mt: 2 }} />
            <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
              <Button variant="outlined" fullWidth onClick={() => navigate("/orders")}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" fullWidth disabled={saving || !validItems.length}>
                {saving ? "Saving..." : orderId ? "Update Order" : "Create Order"}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
