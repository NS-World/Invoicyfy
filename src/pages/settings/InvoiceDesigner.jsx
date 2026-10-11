import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SaveIcon from "@mui/icons-material/Save";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import ImageUpload from "../../components/forms/ImageUpload";
import ThermalReceipt from "../../components/print/ThermalReceipt";
import TaxInvoiceA4 from "../../components/print/TaxInvoiceA4";
import { StoreServices } from "../../services/StoreServices";
import { InvoiceServices } from "../../services/InvoiceServices";
import { clearStoreCache } from "../../hooks/useStores";
import useStores from "../../hooks/useStores";
import { useAuth } from "../../context/useAuth";
import { useNotify } from "../../context/NotifyProvider";
import { apiError } from "../../utils/format";
import { sampleInvoice } from "../../utils/sampleInvoice";
import { A4_TEMPLATES, ACCENT_COLORS, DEFAULT_INVOICE_SETTINGS, RECEIPT_TEMPLATES, getInvoiceSettings } from "../../utils/invoiceSettings";

const A4_SECTIONS = [
  ["show_logo", "Logo"],
  ["show_hsn_column", "HSN/SAC column"],
  ["show_discount_column", "Discount column"],
  ["show_item_notes", "Item notes"],
  ["show_customer_phone", "Customer phone"],
  ["show_amount_in_words", "Amount in words"],
  ["show_hsn_summary", "HSN tax summary"],
  ["show_bank", "Bank details"],
  ["show_upi_qr", "UPI pay QR (unpaid bills)"],
  ["show_terms", "Notes & terms"],
  ["show_signature", "Signature block"],
  ["show_fssai", "FSSAI number"],
];
const RECEIPT_SECTIONS = [
  ["show_status", "PAID / UNPAID line"],
  ["show_logo", "Logo"],
  ["show_address_on_receipt", "Shop address & phone"],
  ["show_gstin_on_receipt", "Shop GSTIN"],
  ["show_customer_phone", "Customer mobile"],
  ["show_cashier", "Cashier name"],
  ["show_item_notes", "Item notes"],
  ["show_tax_on_receipt", "GST lines"],
  ["show_payment_mode", "Payment mode"],
  ["show_fssai", "FSSAI number"],
];
const QR_SUGGESTIONS = ["Review us on Google", "Follow us on Instagram", "Order online", "Our menu", "Join WhatsApp group"];

/** Scaled live preview of a document. */
function Preview({ kind, invoice, settings, template, zoom }) {
  return (
    <Box sx={{ overflow: "auto", bgcolor: "#eef1f4", p: { xs: 1, sm: 2 }, borderRadius: 2 }}>
      <Box sx={{ width: "fit-content", mx: "auto", bgcolor: "#fff", boxShadow: 2, zoom, p: kind === "a4" ? 1 : 0 }}>
        {kind === "a4" ? <TaxInvoiceA4 invoice={invoice} settings={settings} template={template} /> : <ThermalReceipt invoice={invoice} settings={settings} template={template} />}
      </Box>
    </Box>
  );
}

function TemplateCard({ tpl, selected, onSelect, kind, invoice, settings }) {
  return (
    <Paper
      variant="outlined"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
      sx={{
        cursor: "pointer",
        overflow: "hidden",
        borderWidth: 2,
        borderColor: selected ? "primary.main" : "divider",
        transition: "box-shadow .15s",
        "&:hover": { boxShadow: 3 },
        "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
      }}
    >
      <Box sx={{ height: 150, overflow: "hidden", bgcolor: "#eef1f4", display: "flex", justifyContent: "center", pt: 1, pointerEvents: "none" }}>
        <Box sx={{ zoom: kind === "a4" ? 0.24 : 0.42, bgcolor: "#fff", height: "fit-content" }}>
          {kind === "a4" ? <TaxInvoiceA4 invoice={invoice} settings={settings} template={tpl.key} /> : <ThermalReceipt invoice={invoice} settings={settings} template={tpl.key} />}
        </Box>
      </Box>
      <Box sx={{ p: 1, display: "flex", alignItems: "flex-start", gap: 0.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {tpl.name} {tpl.key === "classic" && <Chip label="Default" size="small" sx={{ height: 18, fontSize: 10, ml: 0.5 }} />}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.3 }}>
            {tpl.description}
          </Typography>
        </Box>
        {selected && <CheckCircleIcon color="primary" fontSize="small" />}
      </Box>
    </Paper>
  );
}

export default function InvoiceDesigner() {
  const { user, can, isAdmin } = useAuth();
  const notify = useNotify();
  const { stores } = useStores();
  const canEdit = can("settings", "edit");
  const [storeId, setStoreId] = useState(user?.store_id || "");
  const [store, setStore] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_INVOICE_SETTINGS);
  const [logo, setLogo] = useState(null);
  const [kind, setKind] = useState("a4");
  const [realInvoices, setRealInvoices] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!storeId && stores[0]) setStoreId(stores[0].store_id);
  }, [stores, storeId]);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    StoreServices.getStoreDataFromId(storeId)
      .then((res) => {
        setStore(res.data);
        setSettings(getInvoiceSettings(res.data));
        setLogo(res.data.logo || null);
        setDirty(false);
      })
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
    // Preview with the shop's latest real bills when there are any.
    if (can("invoices", "view")) {
      ["tax", "retail"].forEach((type) =>
        InvoiceServices.getInvoices(0, 1, "", { invoice_type: type, store_id: storeId })
          .then((r) => r.data?.[0] && InvoiceServices.getInvoice(r.data[0].invoice_id))
          .then((r) => r?.data && setRealInvoices((x) => ({ ...x, [type]: r.data })))
          .catch(() => {})
      );
    }
  }, [storeId, can]);

  const previewStore = useMemo(() => (store ? { ...store, logo } : null), [store, logo]);
  const invoice = useMemo(() => {
    if (!previewStore) return null;
    const type = kind === "a4" ? "tax" : "retail";
    const base = realInvoices[type] || sampleInvoice(previewStore, type);
    return { ...base, store: previewStore };
  }, [previewStore, realInvoices, kind]);

  const set = (patch) => {
    setSettings((s) => ({ ...s, ...patch }));
    setDirty(true);
  };
  const setQr = (i, patch) => set({ qr_codes: settings.qr_codes.map((q, j) => (j === i ? { ...q, ...patch } : q)) });

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await StoreServices.updateInvoiceSettings({ store_id: storeId, invoice_settings: settings, logo });
      setStore(res.data);
      clearStoreCache();
      setDirty(false);
      notify("Invoice design saved — new prints will use it");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !invoice) return <Loader />;

  const templates = kind === "a4" ? A4_TEMPLATES : RECEIPT_TEMPLATES;
  const templateKey = kind === "a4" ? "a4_template" : "receipt_template";
  const sections = kind === "a4" ? A4_SECTIONS : RECEIPT_SECTIONS;

  return (
    <Box>
      <PageHeader
        title="Invoice Design"
        subtitle="Choose a template and decide what prints on your bills"
        back="/settings"
        actions={
          canEdit && (
            <>
              <Button
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={() => {
                  setSettings({ ...DEFAULT_INVOICE_SETTINGS });
                  setDirty(true);
                }}
              >
                Reset to default
              </Button>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving || !dirty}>
                {saving ? "Saving..." : dirty ? "Save design" : "Saved"}
              </Button>
            </>
          )
        }
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {!canEdit && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Your role can only view the invoice design.
        </Alert>
      )}

      <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap", mb: 2 }}>
        <Tabs value={kind} onChange={(_, v) => setKind(v)}>
          <Tab value="a4" label="A4 invoice" />
          <Tab value="receipt" label="Thermal receipt" />
        </Tabs>
        {isAdmin && stores.length > 1 && (
          <TextField select label="Store" value={storeId} onChange={(e) => setStoreId(e.target.value)} sx={{ minWidth: 200 }}>
            {stores.map((s) => (
              <MenuItem key={s.store_id} value={s.store_id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                Template
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: `repeat(${templates.length}, minmax(0, 1fr))`, lg: "repeat(2, minmax(0, 1fr))" }, gap: 1.5 }}>
                {templates.map((t) => (
                  <TemplateCard key={t.key} tpl={t} kind={kind} invoice={invoice} settings={settings} selected={settings[templateKey] === t.key} onSelect={() => canEdit && set({ [templateKey]: t.key })} />
                ))}
              </Box>
            </Paper>

            <Accordion defaultExpanded disableGutters sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: 700 }}>Logo & colour</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <ImageUpload
                  value={logo}
                  onChange={(v) => {
                    setLogo(v);
                    setDirty(true);
                  }}
                  label="Logo"
                  hint="Optional · PNG or JPG, resized automatically"
                  disabled={!canEdit}
                />
                <FormControlLabel sx={{ mt: 1 }} control={<Switch checked={settings.show_logo} onChange={(e) => set({ show_logo: e.target.checked })} />} label="Print logo on bills" />
                {kind === "a4" && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Accent colour (Modern, Minimal and Bold templates)
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                      {ACCENT_COLORS.map((c) => (
                        <Tooltip key={c} title={c}>
                          <Box
                            component="button"
                            type="button"
                            onClick={() => set({ accent_color: c })}
                            aria-label={`Colour ${c}`}
                            sx={{ width: 30, height: 30, borderRadius: "50%", bgcolor: c, border: "3px solid", borderColor: settings.accent_color === c ? "#000" : "#fff", boxShadow: 1, cursor: "pointer" }}
                          />
                        </Tooltip>
                      ))}
                      <TextField type="color" value={settings.accent_color} onChange={(e) => set({ accent_color: e.target.value })} sx={{ width: 64 }} slotProps={{ htmlInput: { "aria-label": "Custom colour" } }} />
                    </Box>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>

            <Accordion disableGutters sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: 700 }}>Sections to print</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                  {sections.map(([key, label]) => (
                    <FormControlLabel key={key} control={<Switch size="small" checked={Boolean(settings[key])} onChange={(e) => set({ [key]: e.target.checked })} />} label={<Typography variant="body2">{label}</Typography>} />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>

            <Accordion disableGutters sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: 700 }}>Text & headings</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {kind === "a4" ? (
                    <>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label="Title (GST registered)" value={settings.title_tax} onChange={(e) => set({ title_tax: e.target.value })} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label="Title (no GSTIN)" value={settings.title_retail} onChange={(e) => set({ title_retail: e.target.value })} />
                      </Grid>
                      <Grid size={12}>
                        <TextField fullWidth label="Line under the title" placeholder="e.g. Wholesale & party orders" value={settings.header_note} onChange={(e) => set({ header_note: e.target.value })} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label="Signature label" value={settings.signature_label} onChange={(e) => set({ signature_label: e.target.value })} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label="Footer line" value={settings.footer_note} onChange={(e) => set({ footer_note: e.target.value })} />
                      </Grid>
                    </>
                  ) : (
                    <>
                      <Grid size={12}>
                        <TextField fullWidth label="Line under shop name" placeholder="e.g. Pure veg · Home delivery 9am–11pm" value={settings.receipt_header_note} onChange={(e) => set({ receipt_header_note: e.target.value })} />
                      </Grid>
                      <Grid size={12}>
                        <TextField fullWidth label="Message above footer" placeholder="e.g. Get 10% off on your next visit!" value={settings.receipt_footer_note} onChange={(e) => set({ receipt_footer_note: e.target.value })} />
                      </Grid>
                    </>
                  )}
                </Grid>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                  Shop name, address, GSTIN, FSSAI, bank details, terms and the receipt footer (&quot;Thanks&quot;) are edited in Settings → Business details.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion disableGutters sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: 700 }}>QR codes ({settings.qr_codes.length}/4)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Add QR codes for a Google review, Instagram, online ordering, menu… Paste a link (we make the QR) or upload a QR image you already have.
                </Typography>
                {settings.qr_codes.map((q, i) => {
                  const mode = q.mode || (q.image ? "image" : "link");
                  return (
                  <Paper key={i} variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }}>
                        QR {i + 1}
                      </Typography>
                      <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v) => v && setQr(i, v === "link" ? { mode: "link", image: null } : { mode: "image", url: "" })}>
                        <ToggleButton value="link">Link</ToggleButton>
                        <ToggleButton value="image">Image</ToggleButton>
                      </ToggleButtonGroup>
                      <IconButton size="small" color="error" onClick={() => set({ qr_codes: settings.qr_codes.filter((_, j) => j !== i) })} aria-label="Remove QR">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField fullWidth label="Text under QR" value={q.label || ""} onChange={(e) => setQr(i, { label: e.target.value })} slotProps={{ htmlInput: { maxLength: 40 } }} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField select fullWidth label="Print on" value={q.show_on || "both"} onChange={(e) => setQr(i, { show_on: e.target.value })}>
                          <MenuItem value="both">A4 and receipt</MenuItem>
                          <MenuItem value="a4">A4 invoice only</MenuItem>
                          <MenuItem value="receipt">Receipt only</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid size={12}>
                        {mode === "image" ? (
                          <ImageUpload value={q.image} onChange={(v) => setQr(i, { image: v })} label="QR image" maxSize={300} disabled={!canEdit} />
                        ) : (
                          <TextField fullWidth label="Link" placeholder="https://g.page/r/your-shop/review" value={q.url || ""} onChange={(e) => setQr(i, { url: e.target.value.trim() })} />
                        )}
                      </Grid>
                    </Grid>
                  </Paper>
                  );
                })}
                {settings.qr_codes.length < 4 && (
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => set({ qr_codes: [...settings.qr_codes, { label: "", url: "", show_on: "both" }] })}>
                      Add QR code
                    </Button>
                    {QR_SUGGESTIONS.filter((label) => !settings.qr_codes.some((q) => q.label === label)).slice(0, 3).map((label) => (
                      <Chip key={label} label={`+ ${label}`} variant="outlined" onClick={() => set({ qr_codes: [...settings.qr_codes, { label, url: "", show_on: "both" }] })} />
                    ))}
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          </fieldset>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper sx={{ p: { xs: 1, sm: 2 }, position: { lg: "sticky" }, top: { lg: 16 } }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, px: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Live preview
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {realInvoices[kind === "a4" ? "tax" : "retail"] ? `Your bill ${invoice.invoice_number}` : "Sample bill"}
              </Typography>
            </Box>
            <Preview kind={kind} invoice={invoice} settings={settings} template={settings[templateKey]} zoom={kind === "a4" ? { xs: 0.42, sm: 0.7, lg: 0.62, xl: 0.8 } : { xs: 1, sm: 1.1 }} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
