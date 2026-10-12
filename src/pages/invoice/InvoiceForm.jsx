import { useEffect, useMemo, useState } from "react";
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
import { useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import CustomerPicker from "../../components/billing/CustomerPicker";
import ItemsEditor from "../../components/billing/ItemsEditor";
import TotalsSummary from "../../components/billing/TotalsSummary";
import { InvoiceServices } from "../../services/InvoiceServices";
import { useNotify } from "../../context/NotifyProvider";
import { useAuth } from "../../context/useAuth";
import useMeta from "../../hooks/useMeta";
import useStores from "../../hooks/useStores";
import { apiError, formatCurrency, today } from "../../utils/format";
import { calcTotals, emptyItem, GSTIN_REGEX, itemToApi } from "../../utils/gst";
import { isInterstate } from "../../utils/party";
import { useT } from "../../context/PrefsContext";

/** Quick Bill (retail, thermal receipt) and direct GST tax invoice without an order. */
export default function InvoiceForm() {
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const notify = useNotify();
  const meta = useMeta();
  const { isAdmin } = useAuth();
  const { stores, defaultStoreId } = useStores();

  const [type, setType] = useState(params.get("type") === "tax" ? "tax" : "retail");
  const [storeId, setStoreId] = useState("");
  const [party, setParty] = useState({ customer: null, customer_name: "", customer_phone: "" });
  const [gstin, setGstin] = useState("");
  const [posCode, setPosCode] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [dueDate, setDueDate] = useState("");
  const [orderType, setOrderType] = useState("Counter");
  const [items, setItems] = useState([emptyItem()]);
  const [paid, setPaid] = useState(params.get("type") !== "tax");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Cash");
  const [payRef, setPayRef] = useState("");
  const [extra, setExtra] = useState({ notes: "", terms: "", shipping_address: "", eway_bill_no: "", vehicle_no: "", reverse_charge: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!storeId && defaultStoreId) setStoreId(defaultStoreId);
  }, [defaultStoreId, storeId]);

  const store = stores.find((s) => String(s.store_id) === String(storeId));
  const buyer = party.customer || (gstin ? { gstin } : posCode ? { state_code: posCode } : null);
  const interstate = isInterstate(store, buyer);
  const validItems = items.filter((i) => i.product_name && Number(i.quantity) > 0);
  const totals = useMemo(() => calcTotals(validItems, interstate), [validItems, interstate]);
  const gstinInvalid = gstin && !GSTIN_REGEX.test(gstin);

  const switchType = (t) => {
    if (!t) return;
    setType(t);
    setPaid(t === "retail");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validItems.length) {
      setError("Add at least one item");
      return;
    }
    if (type === "tax" && !party.customer && !party.customer_name) {
      setError("Enter the buyer name for a tax invoice");
      return;
    }
    setSaving(true);
    setError("");
    const amount = payAmount === "" ? totals.total : Number(payAmount);
    try {
      const res = await InvoiceServices.createInvoice({
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
        items: validItems.map(itemToApi),
        payment: paid && amount > 0 ? { amount, payment_method: payMethod, reference_no: payRef || undefined } : undefined,
        ...extra,
        notes: extra.notes || undefined,
        terms: extra.terms || undefined,
      });
      notify(`Invoice ${res.invoice_number} created`);
      navigate(`/invoices/${res.invoice_id}?print=${type === "retail" ? "receipt" : "a4"}`, { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box component="form" onSubmit={submit}>
      <PageHeader
        title={type === "retail" ? "Quick Bill" : "New GST Tax Invoice"}
        back="/invoices"
        actions={
          <ToggleButtonGroup exclusive size="small" color="primary" value={type} onChange={(_, v) => switchType(v)}>
            <ToggleButton value="retail">{t("Retail bill")}</ToggleButton>
            <ToggleButton value="tax">{t("GST invoice (B2B)")}</ToggleButton>
          </ToggleButtonGroup>
        }
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {type === "tax" && store && !store.gstin && (
        <Alert severity="warning" sx={{ mb: 2 }} action={<Button size="small" onClick={() => navigate("/settings")}>{t("Settings")}</Button>}>
          {t("Your business GSTIN is not set. Add it in Business Settings so it prints on tax invoices.")}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
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

          <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
              {t("Items")}
            </Typography>
            <ItemsEditor items={items} onChange={setItems} interstate={interstate} storeId={storeId} />
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

        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 2, position: { lg: "sticky" }, top: { lg: 16 } }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              {t("Summary")}
            </Typography>
            {interstate && (
              <Alert severity="info" sx={{ mb: 1 }}>
                {t("Inter-state supply — IGST applies")}
              </Alert>
            )}
            <TotalsSummary t={totals} interstate={interstate} />

            <Box sx={{ mt: 2, p: 1.5, bgcolor: "action.hover", borderRadius: 2 }}>
              <FormControlLabel control={<Switch checked={paid} onChange={(e) => setPaid(e.target.checked)} />} label={t("Payment received")} />
              {paid && (
                <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                  <Grid size={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label={t("Amount ₹")}
                      value={payAmount === "" ? totals.total : payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      slotProps={{ htmlInput: { min: 0, step: "any", inputMode: "decimal" } }}
                    />
                  </Grid>
                  <Grid size={6}>
                    <TextField select fullWidth label={t("Mode")} value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                      {meta.payment_methods.filter((m) => m !== "Credit").map((m) => (
                        <MenuItem key={m} value={m}>
                          {m}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  {payMethod !== "Cash" && (
                    <Grid size={12}>
                      <TextField fullWidth label={t("Reference / UTR")} value={payRef} onChange={(e) => setPayRef(e.target.value)} />
                    </Grid>
                  )}
                  {payAmount !== "" && Number(payAmount) < totals.total && (
                    <Grid size={12}>
                      <Typography variant="caption" color="warning.main">
                        Balance {formatCurrency(totals.total - Number(payAmount))} will stay due
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              )}
            </Box>

            <TextField fullWidth multiline minRows={2} label={t("Notes")} value={extra.notes} onChange={(e) => setExtra({ ...extra, notes: e.target.value })} sx={{ mt: 2 }} />
            <Button type="submit" variant="contained" size="large" fullWidth sx={{ mt: 2 }} disabled={saving || !validItems.length || Boolean(gstinInvalid)}>
              {saving ? "Saving..." : `Save & Print · ${formatCurrency(totals.total)}`}
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
