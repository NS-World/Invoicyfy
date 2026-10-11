import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import CampaignIcon from "@mui/icons-material/Campaign";
import SendIcon from "@mui/icons-material/Send";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PageHeader from "../../components/common/PageHeader";
import SearchField from "../../components/common/SearchField";
import Toolbar from "../../components/common/Toolbar";
import DataTable from "../../components/common/DataTable";
import StatusChip from "../../components/common/StatusChip";
import { useAuth } from "../../context/useAuth";
import { useNotify } from "../../context/NotifyProvider";
import useDebounce from "../../hooks/useDebounce";
import useServerTable from "../../hooks/useServerTable";
import { CampaignServices } from "../../services/CampaignServices";
import { apiError, formatDate } from "../../utils/format";
import CampaignDialog from "./CampaignDialog";
import WhatsAppPreview from "./WhatsAppPreview";

const STARTERS = [
  { label: "New flavour", text: "Hi {name}! 🍨 New flavour alert at {shop}: Belgian Chocolate Brownie is here. Come taste it this weekend!" },
  { label: "Festival offer", text: "Happy Diwali {name}! 🪔 Get 20% OFF on all family packs at {shop} till Sunday. Show this message at the counter." },
  { label: "Buy 1 Get 1", text: "Hi {name}, it's Buy 1 Get 1 FREE on all scoops at {shop} today from 4–8 PM. See you soon! 🍦" },
  { label: "We miss you", text: "Hi {name}, we miss you at {shop}! Here's 10% OFF on your next visit this week. 😊" },
];
const ACTIVITY = [
  { value: "all", label: "All customers" },
  { value: "buyers", label: "Customers who bought from us" },
  { value: "recent", label: "Bought in the last … days" },
  { value: "inactive", label: "Not visited in the last … days" },
  { value: "top", label: "Top buyers" },
];

function NewOffer({ settings, onCreated }) {
  const notify = useNotify();
  const [form, setForm] = useState({ name: "", message: "", channel: settings.api_ready ? "api" : "manual" });
  const [aud, setAud] = useState({ customer_type: "", activity: "all", days: 30, top: 50, city: "" });
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const audKey = useDebounce(JSON.stringify(aud), 400);

  useEffect(() => {
    let live = true;
    CampaignServices.audience(JSON.parse(audKey))
      .then((r) => live && setPreview(r.data))
      .catch((e) => live && notify(apiError(e), "error"));
    return () => {
      live = false;
    };
  }, [audKey, notify]);

  const sample = preview?.sample?.[0]?.name || "Priya";
  const previewText = form.message.replaceAll("{name}", sample).replaceAll("{shop}", settings.store_name || "");
  const insert = (token) => setForm((f) => ({ ...f, message: `${f.message}${f.message && !f.message.endsWith(" ") ? " " : ""}${token}` }));

  const submit = async () => {
    if (!form.name.trim() || !form.message.trim()) {
      notify("Add an offer name and message", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await CampaignServices.create({ ...form, audience: aud });
      notify(`Offer ready for ${res.data.total} customers`);
      setForm((f) => ({ ...f, name: "", message: "" }));
      onCreated(res.data.campaign_id);
    } catch (e) {
      notify(apiError(e), "error");
    }
    setSaving(false);
  };

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            1. Offer message
          </Typography>
          <TextField fullWidth label="Offer name (for your records)" placeholder="Diwali family pack offer" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} sx={{ mb: 2 }} slotProps={{ htmlInput: { maxLength: 150 } }} />
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mb: 1 }}>
            {STARTERS.map((s) => (
              <Chip key={s.label} label={s.label} variant="outlined" onClick={() => setForm((f) => ({ ...f, message: s.text, name: f.name || s.label }))} />
            ))}
          </Stack>
          <TextField
            fullWidth
            multiline
            minRows={4}
            label="Message"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            helperText={`${form.message.length}/1000 · {name} = customer name, {shop} = your shop name`}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button size="small" onClick={() => insert("{name}")}>
              + Customer name
            </Button>
            <Button size="small" onClick={() => insert("{shop}")}>
              + Shop name
            </Button>
          </Stack>

          <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 3, mb: 1.5 }}>
            2. Who gets it
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label="Customers" value={aud.activity} onChange={(e) => setAud({ ...aud, activity: e.target.value })}>
                {ACTIVITY.map((a) => (
                  <MenuItem key={a.value} value={a.value}>
                    {a.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {(aud.activity === "recent" || aud.activity === "inactive") && (
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField fullWidth type="number" label="Days" value={aud.days} onChange={(e) => setAud({ ...aud, days: e.target.value })} slotProps={{ htmlInput: { min: 1 } }} />
              </Grid>
            )}
            {aud.activity === "top" && (
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField fullWidth type="number" label="How many" value={aud.top} onChange={(e) => setAud({ ...aud, top: e.target.value })} slotProps={{ htmlInput: { min: 1 } }} />
              </Grid>
            )}
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField select fullWidth label="Type" value={aud.customer_type} onChange={(e) => setAud({ ...aud, customer_type: e.target.value })}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="B2C">Retail</MenuItem>
                <MenuItem value="B2B">Business</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label="City" value={aud.city} onChange={(e) => setAud({ ...aud, city: e.target.value })}>
                <MenuItem value="">All cities</MenuItem>
                {(preview?.cities || []).map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
          {preview && (
            <Alert severity={preview.count ? "success" : "warning"} sx={{ mt: 2 }}>
              <b>{preview.count}</b> customer(s) will get this offer.
              {preview.opted_out > 0 && ` ${preview.opted_out} opted out.`}
              {preview.no_phone > 0 && ` ${preview.no_phone} without a valid mobile number.`}
            </Alert>
          )}

          <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 3, mb: 1 }}>
            3. How to send
          </Typography>
          <RadioGroup value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
            <FormControlLabel
              value="api"
              disabled={!settings.api_ready}
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Automatic — WhatsApp Business API
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {settings.api_ready
                      ? `Sends to everyone from +${settings.wa_business_number || "your business number"} in the background.`
                      : "Set up in the WhatsApp setup tab to send to everyone automatically."}
                  </Typography>
                </Box>
              }
              sx={{ mb: 1, alignItems: "flex-start", "& .MuiRadio-root": { pt: 0.5 } }}
            />
            <FormControlLabel
              value="manual"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    From my WhatsApp — one tap per customer
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    No setup. Opens WhatsApp with the message ready; you just press send. Best for a few customers.
                  </Typography>
                </Box>
              }
              sx={{ alignItems: "flex-start", "& .MuiRadio-root": { pt: 0.5 } }}
            />
          </RadioGroup>
          <Button variant="contained" size="large" startIcon={<SendIcon />} onClick={submit} disabled={saving || !preview?.count} sx={{ mt: 2 }} fullWidth>
            {saving ? "Preparing…" : `Send offer to ${preview?.count ?? 0} customers`}
          </Button>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Box sx={{ position: { md: "sticky" }, top: { md: 80 } }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textAlign: "center" }}>
            Preview for {sample}
          </Typography>
          <WhatsAppPreview text={previewText} shop={settings.store_name} />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, textAlign: "center" }}>
            Only customers who allow offers get messages. Turn it off for a customer from their profile.
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );
}

function History({ onOpen, refreshKey }) {
  const table = useServerTable((p, s, q) => CampaignServices.list(p, s, q), { idField: "campaign_id", filters: { refreshKey } });
  const columns = useMemo(
    () => [
      { field: "name", headerName: "Offer", flex: 1.2, minWidth: 160 },
      { field: "created_at", headerName: "Date", width: 120, renderCell: (p) => formatDate(p.value) },
      { field: "channel", headerName: "Sent via", width: 120, renderCell: (p) => (p.value === "api" ? "Business API" : "My WhatsApp") },
      { field: "progress", headerName: "Sent", width: 110, sortable: false, renderCell: (p) => `${p.row.sent} / ${p.row.total}` },
      { field: "failed", headerName: "Failed", width: 80 },
      { field: "status", headerName: "Status", width: 120, renderCell: (p) => <StatusChip status={p.value} /> },
    ],
    []
  );
  return (
    <>
      <Toolbar>
        <SearchField value={table.search} onChange={table.setSearch} placeholder="Search offers" />
      </Toolbar>
      <DataTable table={table} columns={columns} mobileHidden={["channel", "failed", "created_at"]} onRowClick={(p) => onOpen(p.row.campaign_id)} />
    </>
  );
}

function Setup({ settings, onSaved }) {
  const notify = useNotify();
  const [form, setForm] = useState({
    wa_business_number: settings.wa_business_number || "",
    wa_phone_number_id: settings.wa_phone_number_id || "",
    wa_access_token: "",
    wa_template_name: settings.wa_template_name || "",
    wa_template_lang: settings.wa_template_lang || "en",
  });
  const [testPhone, setTestPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (extra = {}) => {
    setBusy(true);
    try {
      const res = await CampaignServices.saveSettings({ ...form, ...extra });
      notify(res.message);
      setForm((f) => ({ ...f, wa_access_token: "" }));
      onSaved(res.data);
    } catch (e) {
      notify(apiError(e), "error");
    }
    setBusy(false);
  };
  const test = async () => {
    setBusy(true);
    try {
      const res = await CampaignServices.test({ phone: testPhone, message: "Hi {name}, this is a test offer from {shop}." });
      notify(res.message);
    } catch (e) {
      notify(apiError(e), "error");
    }
    setBusy(false);
  };

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
            Business WhatsApp number
          </Typography>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField fullWidth label="WhatsApp business number" placeholder="98250 12345" value={form.wa_business_number} onChange={set("wa_business_number")} slotProps={{ input: { startAdornment: <InputAdornment position="start">+</InputAdornment> } }} helperText="The number customers see the offer from (with country code; 10-digit Indian numbers get 91 added)." />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Phone number ID" value={form.wa_phone_number_id} onChange={set("wa_phone_number_id")} helperText="From Meta › WhatsApp Manager › API setup" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="password"
                label="Permanent access token"
                value={form.wa_access_token}
                onChange={set("wa_access_token")}
                placeholder={settings.token_set ? "Saved — leave blank to keep" : ""}
                helperText={settings.token_set ? "Saved securely (encrypted)." : "Stored encrypted, never shown again."}
                autoComplete="new-password"
              />
            </Grid>
            <Grid size={{ xs: 8 }}>
              <TextField fullWidth label="Approved template name" placeholder="scoopiez_offer" value={form.wa_template_name} onChange={set("wa_template_name")} />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField fullWidth label="Language" value={form.wa_template_lang} onChange={set("wa_template_lang")} />
            </Grid>
          </Grid>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}>
            <Button variant="contained" onClick={() => save()} disabled={busy}>
              Save settings
            </Button>
            {settings.token_set && (
              <Button color="error" onClick={() => save({ clear_token: true })} disabled={busy}>
                Remove token
              </Button>
            )}
          </Stack>
          {settings.api_ready && (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 3 }}>
              <TextField size="small" label="Send a test to mobile" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
              <Button variant="outlined" startIcon={<WhatsAppIcon />} onClick={test} disabled={busy || !testPhone}>
                Send test
              </Button>
            </Stack>
          )}
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>
              One-time setup (like big brands)
            </Typography>
            <Typography variant="body2" component="ol" sx={{ pl: 2, "& li": { mb: 0.75 } }}>
              <li>Create a free Meta Business account and add your shop number in WhatsApp Manager (WhatsApp Business Platform).</li>
              <li>
                Create a <b>Marketing</b> message template, for example:
                <Box component="pre" sx={{ whiteSpace: "pre-wrap", bgcolor: "action.hover", p: 1, borderRadius: 1, fontSize: 12, my: 1 }}>
                  {"Hello {{1}} 👋\n\n{{2}}\n\nReply STOP to stop offers."}
                </Box>
                {"{{1}}"} is filled with the customer name and {"{{2}}"} with your offer message.
              </li>
              <li>After Meta approves it, paste the Phone number ID, a permanent access token and the template name here.</li>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Meta charges a small fee per marketing message. Without this setup you can still send from your own WhatsApp, one tap per customer.
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default function Offers() {
  const notify = useNotify();
  const { can } = useAuth();
  const [tab, setTab] = useState(can("marketing", "add") ? "new" : "history");
  const [settings, setSettings] = useState(null);
  const [open, setOpen] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    CampaignServices.settings()
      .then((r) => setSettings(r.data))
      .catch((e) => notify(apiError(e), "error"));
  }, [notify]);

  return (
    <Box>
      <PageHeader title="Offers & Messages" subtitle="Send new offers and flavour updates to your customers on WhatsApp" />
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
          {can("marketing", "add") && <Tab value="new" icon={<CampaignIcon />} iconPosition="start" label="New offer" />}
          <Tab value="history" label="Sent offers" />
          {can("marketing", "edit") && <Tab value="setup" icon={<WhatsAppIcon />} iconPosition="start" label="WhatsApp setup" />}
        </Tabs>
      </Paper>
      {settings && tab === "new" && (
        <NewOffer
          settings={settings}
          onCreated={(id) => {
            setRefreshKey((k) => k + 1);
            setOpen(id);
          }}
        />
      )}
      {tab === "history" && <History onOpen={setOpen} refreshKey={refreshKey} />}
      {settings && tab === "setup" && <Setup settings={settings} onSaved={setSettings} />}
      {open && (
        <CampaignDialog
          campaignId={open}
          onClose={() => {
            setOpen(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </Box>
  );
}
