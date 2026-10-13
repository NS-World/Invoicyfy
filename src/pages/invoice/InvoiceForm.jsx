import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import CustomerPicker from "../../components/billing/CustomerPicker";
import ProductCatalog from "../../components/billing/ProductCatalog";
import BillCart from "../../components/billing/BillCart";
import useBillPicker from "../../components/billing/useBillPicker";
import useCatalog from "../../hooks/useCatalog";
import { billLines } from "../../utils/billItems";
import { getInvoiceSettings } from "../../utils/invoiceSettings";
import TotalsSummary from "../../components/billing/TotalsSummary";
import PaymentBox from "../../components/billing/v3/PaymentBox";
import CouponPoints from "../../components/billing/v3/CouponPoints";
import ApprovalPinDialog from "../../components/billing/v3/ApprovalPinDialog";
import TablePicker from "../../components/billing/v3/TablePicker";
import HeldBills from "../../components/billing/v3/HeldBills";
import OfflineSavedDialog from "../../components/billing/v3/OfflineSavedDialog";
import { BillServices, HeldServices, PosServices } from "../../services/V3Services";
import useDebounce from "../../hooks/useDebounce";
import { fromServerTotals, newUuid, paymentAmounts } from "../../utils/payments";
import { isNetworkError, queueBill } from "../../utils/offline";
import { buildOfflineInvoice } from "../../utils/offlineInvoice";
import { InvoiceServices } from "../../services/InvoiceServices";
import { useNotify } from "../../context/NotifyProvider";
import { useAuth } from "../../context/useAuth";
import useMeta from "../../hooks/useMeta";
import useStores from "../../hooks/useStores";
import { apiError, formatCurrency, today } from "../../utils/format";
import { calcTotals, GSTIN_REGEX, itemToApi } from "../../utils/gst";
import { isInterstate } from "../../utils/party";
import { useT } from "../../context/PrefsContext";

/** Quick Bill (retail, thermal receipt) and direct GST tax invoice without an order. */
export default function InvoiceForm() {
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const notify = useNotify();
  const meta = useMeta();
  const { isAdmin, user } = useAuth();
  const { stores, defaultStoreId } = useStores();

  const [type, setType] = useState(params.get("type") === "tax" ? "tax" : "retail");
  const [storeId, setStoreId] = useState("");
  const [party, setParty] = useState({ customer: null, customer_name: "", customer_phone: "" });
  const [gstin, setGstin] = useState("");
  const [posCode, setPosCode] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [dueDate, setDueDate] = useState("");
  const [orderType, setOrderType] = useState("Counter");
  const [items, setItems] = useState([]);
  const [kot, setKot] = useState(null); // null = shop default from Invoice Design
  const cartRef = useRef(null);
  const [paid, setPaid] = useState(params.get("type") !== "tax");
  const [payRows, setPayRows] = useState([{ method: "Cash", amount: "", reference: "" }]);
  const [tableNo, setTableNo] = useState("");
  const [busyTables, setBusyTables] = useState([]);
  const [pos, setPos] = useState(null);
  const [disc, setDisc] = useState({ coupon_code: "", redeem_points: 0 });
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [approval, setApproval] = useState(null); // { info, payload }
  const [errorCode, setErrorCode] = useState("");
  const [heldKey, setHeldKey] = useState(0);
  const [offlineBill, setOfflineBill] = useState(null);
  const uuid = useRef(newUuid());
  const [extra, setExtra] = useState({ notes: "", terms: "", shipping_address: "", eway_bill_no: "", vehicle_no: "", reverse_charge: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!storeId && defaultStoreId) setStoreId(defaultStoreId);
  }, [defaultStoreId, storeId]);

  const store = stores.find((s) => String(s.store_id) === String(storeId));
  const buyer = party.customer || (gstin ? { gstin } : posCode ? { state_code: posCode } : null);
  const interstate = isInterstate(store, buyer);
  const catalog = useCatalog(storeId);
  const { pick, addCustom, dialog } = useBillPicker(setItems);
  const kotOn = type === "retail" && (kot ?? getInvoiceSettings(store).kot_auto);
  const validItems = billLines(items);
  const localTotals = useMemo(() => calcTotals(validItems, interstate), [validItems, interstate]);
  const gstinInvalid = gstin && !GSTIN_REGEX.test(gstin);

  // Counter settings: tables, UPI QR, loyalty on/off.
  useEffect(() => {
    if (!storeId) return;
    PosServices.get(storeId)
      .then((r) => setPos(r.data))
      .catch(() => {});
  }, [storeId]);

  // Coupon / points: the server works out the exact discount (debounced while the cart changes).
  const customerId = party.customer?.customer_id || null;
  const wantQuote = validItems.length > 0 && (disc.coupon_code || disc.redeem_points > 0 || (customerId && pos?.loyalty?.enabled));
  const quoteKey = useDebounce(wantQuote ? JSON.stringify([storeId, customerId, disc, interstate, validItems.map(itemToApi)]) : "", 350);
  useEffect(() => {
    if (!quoteKey) {
      setQuote(null);
      setQuoteError("");
      return undefined;
    }
    let live = true;
    const [sid, cid, d, , lines] = JSON.parse(quoteKey);
    BillServices.quote({ store_id: sid, customer_id: cid, items: lines, coupon_code: d.coupon_code || undefined, redeem_points: d.redeem_points || undefined })
      .then((r) => {
        if (!live) return;
        setQuote(r.data);
        setQuoteError("");
      })
      .catch((e) => {
        if (!live || isNetworkError(e)) return;
        setQuote(null);
        setQuoteError(apiError(e));
      });
    return () => {
      live = false;
    };
  }, [quoteKey]);
  const discounted = Boolean(quote && !quoteError && (disc.coupon_code || disc.redeem_points > 0));
  const totals = discounted ? { ...fromServerTotals(quote.totals, validItems.length), qty: localTotals.qty, tax: quote.totals.tax_amount } : localTotals;

  const switchType = (t) => {
    if (!t) return;
    setType(t);
    setPaid(t === "retail");
  };

  const resetBill = () => {
    uuid.current = newUuid();
    setItems([]);
    setParty({ customer: null, customer_name: "", customer_phone: "" });
    setPayRows([{ method: "Cash", amount: "", reference: "" }]);
    setTableNo("");
    setDisc({ coupon_code: "", redeem_points: 0 });
    setExtra((x) => ({ ...x, notes: "" }));
    setError("");
  };

  // Park this bill and start the next customer.
  const hold = async () => {
    if (!validItems.length) return;
    try {
      await HeldServices.save({
        store_id: storeId,
        table_no: tableNo || undefined,
        label: party.customer?.name || party.customer_name || undefined,
        customer_name: party.customer?.name || party.customer_name || undefined,
        total: totals.total,
        payload: { items: validItems, party, orderType, tableNo, disc, notes: extra.notes, type },
      });
      notify(t("Bill put on hold"));
      resetBill();
      setHeldKey((k) => k + 1);
    } catch (err) {
      notify(apiError(err), "error");
    }
  };
  const resume = useCallback((p) => {
    setItems((p.items || []).map((it) => ({ ...it, key: it.key || newUuid() })));
    setParty(p.party || { customer: null, customer_name: "", customer_phone: "" });
    setOrderType(p.orderType || "Counter");
    setTableNo(p.tableNo || "");
    setDisc(p.disc || { coupon_code: "", redeem_points: 0 });
    setExtra((x) => ({ ...x, notes: p.notes || "" }));
    if (p.type) setType(p.type);
    uuid.current = newUuid();
  }, []);

  const send = async (payload) => {
    setSaving(true);
    setError("");
    setErrorCode("");
    try {
      const res = await InvoiceServices.createInvoice(payload);
      uuid.current = newUuid();
      notify(`Invoice ${res.invoice_number} created`);
      navigate(`/invoices/${res.invoice_id}?print=${type === "retail" ? "receipt" : "a4"}${kotOn ? "&kot=1" : ""}`, { replace: true });
    } catch (err) {
      const data = err?.response?.data || {};
      if (data.code === "approval_required" || data.code === "approval_wrong_pin") {
        setApproval({ info: { ...data, wrong: data.code === "approval_wrong_pin" }, payload });
      } else if (isNetworkError(err) && type === "retail" && !payload.coupon_code && !payload.redeem_points && !payload.order_id) {
        // No internet: keep the bill on this device and print it now; it is sent when the connection is back.
        try {
          const preview = buildOfflineInvoice({
            uuid: payload.client_uuid,
            store,
            items: validItems,
            totals,
            interstate,
            party,
            orderType,
            tableNo,
            payments: payload.payments || [],
            user,
            notes: payload.notes,
          });
          await queueBill(payload, preview);
          setOfflineBill({ invoice: preview, withKot: kotOn });
        } catch (qErr) {
          setError(qErr.message || apiError(err));
        }
      } else {
        setErrorCode(data.code || "");
        setError(apiError(err));
      }
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
    if (type === "tax" && !party.customer && !party.customer_name) {
      setError("Enter the buyer name for a tax invoice");
      return;
    }
    const amounts = paymentAmounts(payRows, totals.total);
    const payments = paid ? payRows.map((r, i) => ({ amount: amounts[i], payment_method: r.method, reference_no: r.reference || undefined })).filter((p) => p.amount > 0) : [];
    await send({
      invoice_type: type,
      store_id: storeId,
      customer_id: party.customer?.customer_id || null,
      customer_name: party.customer ? undefined : party.customer_name || undefined,
      customer_phone: party.customer ? undefined : party.customer_phone || undefined,
      customer_gstin: !party.customer && gstin ? gstin : undefined,
      place_of_supply_code: !party.customer && posCode ? posCode : undefined,
      invoice_date: invoiceDate,
      due_date: !paid && dueDate ? dueDate : undefined,
      order_type: type === "retail" ? orderType : undefined,
      table_no: tableNo || undefined,
      items: validItems.map(itemToApi),
      payments: payments.length ? payments : undefined,
      coupon_code: disc.coupon_code || undefined,
      redeem_points: disc.redeem_points || undefined,
      client_uuid: uuid.current,
      ...extra,
      notes: extra.notes || undefined,
      terms: extra.terms || undefined,
    });
  };

  return (
    <Box component="form" onSubmit={submit}>
      <PageHeader
        title={type === "retail" ? "Quick Bill" : "New GST Tax Invoice"}
        back="/invoices"
        actions={
          <>
            {storeId && <HeldBills storeId={storeId} onResume={resume} reloadKey={heldKey} onTablesBusy={setBusyTables} />}
            <ToggleButtonGroup exclusive size="small" color="primary" value={type} onChange={(_, v) => switchType(v)}>
              <ToggleButton value="retail">{t("Retail bill")}</ToggleButton>
              <ToggleButton value="tax">{t("GST invoice (B2B)")}</ToggleButton>
            </ToggleButtonGroup>
          </>
        }
      />
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setError("")}
          action={errorCode === "day_not_open" ? <Button size="small" onClick={() => navigate("/day-close")}>{t("Open day")}</Button> : undefined}
        >
          {error}
        </Alert>
      )}
      {type === "tax" && store && !store.gstin && (
        <Alert severity="warning" sx={{ mb: 2 }} action={<Button size="small" onClick={() => navigate("/settings")}>{t("Settings")}</Button>}>
          {t("Your business GSTIN is not set. Add it in Business Settings so it prints on tax invoices.")}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }} data-tour="bill-customer">
            <Grid container spacing={2}>
              <Grid size={12}>
                <CustomerPicker value={party} onChange={setParty} />
              </Grid>
              {type === "tax" && !party.customer && (
                <>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label={t("Buyer GSTIN (for B2B)")}
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase().trim())}
                      error={Boolean(gstinInvalid)}
                      helperText={gstinInvalid ? "Format: 24ABCDE1234F1Z5" : "Leave empty for unregistered buyer"}
                      slotProps={{ htmlInput: { maxLength: 15 } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField select fullWidth label={t("Place of supply")} value={gstin ? gstin.slice(0, 2) : posCode} onChange={(e) => setPosCode(e.target.value)} disabled={Boolean(gstin)} helperText={t("Buyer's state")}>
                      <MenuItem value="">{t("Same as store")}</MenuItem>
                      {meta.states.map((s) => (
                        <MenuItem key={s.code} value={s.code}>
                          {s.code} - {s.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </>
              )}
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField fullWidth type="date" label={t("Invoice date")} value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              {type === "retail" ? (
                <Grid size={{ xs: 6, sm: 4 }}>
                  <TextField select fullWidth label={t("Order type")} value={orderType} onChange={(e) => setOrderType(e.target.value)}>
                    {meta.order_types.map((ot) => (
                      <MenuItem key={ot} value={ot}>
                        {t(ot)}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              ) : (
                <Grid size={{ xs: 6, sm: 4 }}>
                  <TextField fullWidth type="date" label={t("Due date")} value={dueDate} onChange={(e) => setDueDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} disabled={paid} />
                </Grid>
              )}
              {type === "retail" && pos?.table_count > 0 && (
                <Grid size={12}>
                  <TablePicker
                    count={pos.table_count}
                    value={tableNo}
                    busy={busyTables}
                    onChange={(n) => {
                      setTableNo(n);
                      if (n) setOrderType("Dine-in");
                    }}
                  />
                </Grid>
              )}
              {isAdmin && stores.length > 1 && (
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField select fullWidth label={t("Store")} value={storeId} onChange={(e) => setStoreId(e.target.value)}>
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

          <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }} data-tour="catalog">
            <ProductCatalog catalog={catalog} items={items} onPick={pick} onCustom={addCustom} />
          </Paper>

          {type === "tax" && (
            <Accordion disableGutters sx={{ borderRadius: 3, "&:before": { display: "none" } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: 600 }}>{t("More details (shipping, e-way bill, terms)")}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={12}>
                    <TextField fullWidth multiline minRows={2} label={t("Ship to address")} value={extra.shipping_address} onChange={(e) => setExtra({ ...extra, shipping_address: e.target.value })} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField fullWidth label={t("E-way bill no.")} value={extra.eway_bill_no} onChange={(e) => setExtra({ ...extra, eway_bill_no: e.target.value })} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField fullWidth label={t("Vehicle no.")} value={extra.vehicle_no} onChange={(e) => setExtra({ ...extra, vehicle_no: e.target.value.toUpperCase() })} />
                  </Grid>
                  <Grid size={12}>
                    <TextField fullWidth multiline minRows={2} label={t("Terms & conditions")} placeholder={t("Leave empty to use the terms from Business Settings")} value={extra.terms} onChange={(e) => setExtra({ ...extra, terms: e.target.value })} />
                  </Grid>
                  <Grid size={12}>
                    <FormControlLabel control={<Switch checked={extra.reverse_charge} onChange={(e) => setExtra({ ...extra, reverse_charge: e.target.checked })} />} label={t("Tax payable on reverse charge")} />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          )}
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Box sx={{ position: { lg: "sticky" }, top: { lg: 16 } }}>
            <Paper ref={cartRef} sx={{ p: 2, mb: 2, scrollMarginTop: 72 }} data-tour="bill-cart">
              <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
                  {t("Bill items")} {validItems.length > 0 && `(${validItems.length})`}
                </Typography>
                {items.length > 0 && (
                  <Button size="small" color="inherit" onClick={() => setItems([])}>
                    {t("Clear")}
                  </Button>
                )}
              </Box>
              <BillCart items={items} onChange={setItems} interstate={interstate} maxHeight={{ lg: "36vh" }} />
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
              {validItems.length > 0 && (
                <CouponPoints
                  value={disc}
                  onChange={setDisc}
                  quote={quote}
                  error={quoteError}
                  hasCustomer={Boolean(customerId)}
                  loyaltyEnabled={Boolean(pos?.loyalty?.enabled)}
                />
              )}
              {quote?.approval_required && (
                <Alert severity="warning" sx={{ mt: 1, py: 0 }}>
                  {t("Discount {p}% is above your limit of {l}%.", { p: quote.manual_discount_percent, l: quote.discount_limit })} {t("A manager PIN will be asked.")}
                </Alert>
              )}

              <PaymentBox total={totals.total} paid={paid} onPaid={setPaid} rows={payRows} onRows={setPayRows} methods={meta.payment_methods} upi={pos} />

              <TextField fullWidth multiline minRows={1} label={t("Notes")} value={extra.notes} onChange={(e) => setExtra({ ...extra, notes: e.target.value })} sx={{ mt: 2 }} />
              {type === "retail" && (
                <FormControlLabel
                  sx={{ mt: 1 }}
                  control={<Switch checked={Boolean(kotOn)} onChange={(e) => setKot(e.target.checked)} />}
                  label={t("Also print KOT (kitchen copy)")}
                />
              )}
              <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                {type === "retail" && (
                  <Button variant="outlined" size="large" onClick={hold} disabled={saving || !validItems.length} startIcon={<PauseCircleIcon />} data-tour="hold-btn">
                    {t("Hold")}
                  </Button>
                )}
                <Button type="submit" variant="contained" size="large" fullWidth disabled={saving || !validItems.length || Boolean(gstinInvalid)} data-tour="save-bill">
                  {saving ? t("Saving...") : `${t("Save & Print")} · ${formatCurrency(totals.total)}`}
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
      {offlineBill && (
        <OfflineSavedDialog
          invoice={offlineBill.invoice}
          withKot={offlineBill.withKot}
          onClose={() => {
            setOfflineBill(null);
            resetBill();
          }}
        />
      )}
      {/* Phones / tablets: total and save stay in reach while picking items. */}
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
          {t("View bill")}
        </Button>
        <Button type="submit" variant="contained" disabled={saving || Boolean(gstinInvalid)}>
          {t("Save")}
        </Button>
      </Paper>
    </Box>
  );
}
