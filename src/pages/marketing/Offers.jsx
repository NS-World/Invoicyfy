import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import CampaignIcon from "@mui/icons-material/Campaign";
import SendIcon from "@mui/icons-material/Send";
import SettingsIcon from "@mui/icons-material/SettingsOutlined";
import ImageIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import PageHeader from "../../components/common/PageHeader";
import SearchField from "../../components/common/SearchField";
import Toolbar from "../../components/common/Toolbar";
import DataTable from "../../components/common/DataTable";
import StatusChip from "../../components/common/StatusChip";
import { useAuth } from "../../context/useAuth";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import useDebounce from "../../hooks/useDebounce";
import useServerTable from "../../hooks/useServerTable";
import { CampaignServices } from "../../services/CampaignServices";
import { apiError, formatDate } from "../../utils/format";
import { resizeImage } from "../../utils/image";
import CampaignDialog from "./CampaignDialog";
import WhatsAppPreview from "./WhatsAppPreview";
import { CHANNEL_ICON, CHANNEL_NAME } from "./channelMeta";

const STARTERS = [
  { label: "New flavour", text: "Hi {name}! 🍨 New flavour alert at {shop}: Belgian Chocolate Brownie is here. Come taste it this weekend!" },
  { label: "Festival offer", text: "Happy Diwali {name}! 🪔 Get 20% OFF on all family packs at {shop} till Sunday. Show this message at the counter." },
  { label: "Navratri", text: "Jai Mata Di {name}! 🙏 Navratri special at {shop}: Family Packs 20% OFF + 2 scoops, 1 FREE 🍨💃 Valid till Dussehra." },
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

function NewOffer({ settings, onCreated, onSetup }) {
  const t = useT();
  const notify = useNotify();
  const wa = settings.whatsapp;
  const [form, setForm] = useState({ name: "", message: "", subject: "", image_url: "", whatsapp_mode: wa.api_ready ? "api" : "manual" });
  const [channels, setChannels] = useState(() => ({ whatsapp: true, email: settings.email.ready, sms: false }));
  const [aud, setAud] = useState({ customer_type: "", activity: "all", days: 30, top: 50, city: "" });
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const chosen = Object.keys(channels).filter((c) => channels[c]);
  const audKey = useDebounce(JSON.stringify({ ...aud, channels: chosen.join(",") }), 400);

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
  const ready = { whatsapp: true, email: settings.email.ready, sms: settings.sms.ready };
  const automatic = chosen.filter((c) => c !== "whatsapp" || form.whatsapp_mode === "api");

  const pickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const data = await resizeImage(file, 1280, "image/jpeg", 0.85);
      const res = await CampaignServices.uploadImage(data);
      setForm((f) => ({ ...f, image_url: res.url }));
    } catch (err) {
      notify(err?.response ? apiError(err) : err.message, "error");
    }
    setUploading(false);
  };

  const submit = async () => {
    if (!form.name.trim() || !form.message.trim()) {
      notify(t("Add an offer name and message"), "error");
      return;
    }
    if (wa.wa_template_image && channels.whatsapp && form.whatsapp_mode === "api" && !form.image_url) {
      notify(t("Your WhatsApp template needs a picture: add an offer image"), "error");
      return;
    }
    setSaving(true);
    try {
      const res = await CampaignServices.create({ ...form, channels: chosen, audience: aud });
      notify(t("Offer is going out: {n} messages", { n: res.data.total }));
      setForm((f) => ({ ...f, name: "", message: "", subject: "", image_url: "" }));
      onCreated(res.data.campaign_id);
    } catch (e) {
      notify(apiError(e), "error");
    }
    setSaving(false);
  };

  const channelBox = (key, title, hint) => (
    <Paper key={key} variant="outlined" sx={{ p: 1.5, borderColor: channels[key] ? "primary.main" : "divider", opacity: ready[key] ? 1 : 0.85 }}>
      <FormControlLabel
        sx={{ m: 0, width: "100%" }}
        control={<Checkbox checked={channels[key]} disabled={!ready[key]} onChange={(e) => setChannels((c) => ({ ...c, [key]: e.target.checked }))} />}
        label={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {CHANNEL_ICON[key]}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {title}
                {preview?.counts?.[key] !== undefined && channels[key] && ` · ${preview.counts[key]}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {hint}
              </Typography>
            </Box>
          </Box>
        }
      />
      {!ready[key] && (
        <Button size="small" startIcon={<SettingsIcon />} onClick={onSetup} sx={{ ml: 4 }}>
          {t("Set up")}
        </Button>
      )}
    </Paper>
  );

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            1. {t("Offer message")}
          </Typography>
          <TextField fullWidth label={t("Offer name (for your records)")} placeholder="Diwali family pack offer" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} sx={{ mb: 2 }} slotProps={{ htmlInput: { maxLength: 150 } }} />
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mb: 1 }}>
            {STARTERS.map((s) => (
              <Chip key={s.label} label={t(s.label)} variant="outlined" onClick={() => setForm((f) => ({ ...f, message: s.text, name: f.name || s.label }))} />
            ))}
          </Stack>
          <TextField
            fullWidth
            multiline
            minRows={4}
            label={t("Message")}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            helperText={`${form.message.length}/1000 · {name} = ${t("customer name")}, {shop} = ${t("your shop name")}`}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }} useFlexGap>
            <Button size="small" onClick={() => insert("{name}")}>
              + {t("Customer name")}
            </Button>
            <Button size="small" onClick={() => insert("{shop}")}>
              + {t("Shop name")}
            </Button>
            <Box sx={{ flex: 1 }} />
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pickImage} />
            {form.image_url ? (
              <Chip
                avatar={<Box component="img" src={form.image_url} alt="" sx={{ width: 24, height: 24, objectFit: "cover", borderRadius: "50%" }} />}
                label={t("Offer picture added")}
                onDelete={() => setForm((f) => ({ ...f, image_url: "" }))}
                deleteIcon={<DeleteIcon />}
              />
            ) : (
              <Button size="small" variant="outlined" startIcon={uploading ? <CircularProgress size={16} /> : <ImageIcon />} disabled={uploading} onClick={() => fileRef.current?.click()}>
                {t("Add picture (optional)")}
              </Button>
            )}
          </Stack>

          <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 3, mb: 1.5 }}>
            2. {t("Who gets it")}
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label={t("Customers")} value={aud.activity} onChange={(e) => setAud({ ...aud, activity: e.target.value })}>
                {ACTIVITY.map((a) => (
                  <MenuItem key={a.value} value={a.value}>
                    {t(a.label)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {(aud.activity === "recent" || aud.activity === "inactive") && (
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField fullWidth type="number" label={t("Days")} value={aud.days} onChange={(e) => setAud({ ...aud, days: e.target.value })} slotProps={{ htmlInput: { min: 1 } }} />
              </Grid>
            )}
            {aud.activity === "top" && (
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField fullWidth type="number" label={t("How many")} value={aud.top} onChange={(e) => setAud({ ...aud, top: e.target.value })} slotProps={{ htmlInput: { min: 1 } }} />
              </Grid>
            )}
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField select fullWidth label={t("Type")} value={aud.customer_type} onChange={(e) => setAud({ ...aud, customer_type: e.target.value })}>
                <MenuItem value="">{t("All")}</MenuItem>
                <MenuItem value="B2C">{t("Retail")}</MenuItem>
                <MenuItem value="B2B">{t("Business")}</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label={t("City")} value={aud.city} onChange={(e) => setAud({ ...aud, city: e.target.value })}>
                <MenuItem value="">{t("All cities")}</MenuItem>
                {(preview?.cities || []).map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 3, mb: 1 }}>
            3. {t("Send by")}
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" }, gap: 1 }}>
            {channelBox("whatsapp", "WhatsApp", form.whatsapp_mode === "api" ? t("Automatic (Business API)") : t("One tap per customer"))}
            {channelBox("email", "Email", ready.email ? t("Automatic") : t("Not set up"))}
            {channelBox("sms", "SMS", ready.sms ? t("Automatic") : t("Not set up"))}
          </Box>
          {channels.whatsapp && (
            <RadioGroup row value={form.whatsapp_mode} onChange={(e) => setForm({ ...form, whatsapp_mode: e.target.value })} sx={{ mt: 1 }}>
              <FormControlLabel value="api" disabled={!wa.api_ready} control={<Radio size="small" />} label={<Typography variant="body2">{t("WhatsApp automatic (Business API)")}</Typography>} />
              <FormControlLabel value="manual" control={<Radio size="small" />} label={<Typography variant="body2">{t("From my WhatsApp (one tap each)")}</Typography>} />
            </RadioGroup>
          )}
          {channels.email && (
            <TextField fullWidth sx={{ mt: 1.5 }} label={t("Email subject")} placeholder={t("e.g. Navratri special for {name} 🎉")} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} slotProps={{ htmlInput: { maxLength: 200 } }} />
          )}

          {preview && (
            <Alert severity={preview.messages ? "success" : "warning"} sx={{ mt: 2 }}>
              <b>{preview.count}</b> {t("customer(s)")} · <b>{preview.messages}</b> {t("message(s)")}
              {preview.opted_out > 0 && ` · ${preview.opted_out} ${t("opted out")}`}
              {preview.no_phone > 0 && (channels.whatsapp || channels.sms) && ` · ${preview.no_phone} ${t("without mobile")}`}
              {preview.no_email > 0 && channels.email && ` · ${preview.no_email} ${t("without email")}`}
            </Alert>
          )}
          <Button variant="contained" size="large" startIcon={<SendIcon />} onClick={submit} disabled={saving || !preview?.messages || !chosen.length} sx={{ mt: 2 }} fullWidth>
            {saving ? t("Preparing…") : t("Send offer in one click ({n} messages)", { n: preview?.messages ?? 0 })}
          </Button>
          {automatic.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, textAlign: "center" }}>
              {t("{channels} go out automatically, even if you close this page.", { channels: automatic.map((c) => CHANNEL_NAME[c]).join(", ") })}
            </Typography>
          )}
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Box sx={{ position: { md: "sticky" }, top: { md: 80 } }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textAlign: "center" }}>
            {t("Preview for")} {sample}
          </Typography>
          <WhatsAppPreview text={previewText} shop={settings.store_name} image={form.image_url} />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, textAlign: "center" }}>
            {t("Only customers who allow offers get messages. Turn it off for a customer from their profile.")}
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
      {
        field: "channels",
        headerName: "Sent via",
        width: 130,
        sortable: false,
        renderCell: (p) => (
          <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", height: "100%", color: "text.secondary" }}>
            {(p.value || "whatsapp").split(",").map((c) => (
              <span key={c} title={CHANNEL_NAME[c]}>
                {CHANNEL_ICON[c]}
              </span>
            ))}
          </Box>
        ),
      },
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
      <DataTable table={table} columns={columns} mobileHidden={["channels", "failed", "created_at"]} onRowClick={(p) => onOpen(p.row.campaign_id)} />
    </>
  );
}

function SecretField({ label, isSet, value, onChange }) {
  const t = useT();
  return (
    <TextField
      fullWidth
      type="password"
      label={label}
      value={value}
      onChange={onChange}
      placeholder={isSet ? t("Saved — leave blank to keep") : ""}
      helperText={isSet ? t("Saved securely (encrypted).") : t("Stored encrypted, never shown again.")}
      autoComplete="new-password"
    />
  );
}

function WhatsAppSetup({ settings, onSaved }) {
  const t = useT();
  const notify = useNotify();
  const w = settings.whatsapp;
  const [form, setForm] = useState({
    wa_business_number: w.wa_business_number || "",
    wa_phone_number_id: w.wa_phone_number_id || "",
    wa_access_token: "",
    wa_template_name: w.wa_template_name || "",
    wa_template_lang: w.wa_template_lang || "en",
    wa_template_image: Boolean(w.wa_template_image),
  });
  const [testPhone, setTestPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (extra = {}) => {
    setBusy(true);
    try {
      const res = await CampaignServices.saveSettings({ ...form, ...extra });
      notify(t("WhatsApp settings saved"));
      setForm((f) => ({ ...f, wa_access_token: "" }));
      onSaved({ whatsapp: res.data });
    } catch (e) {
      notify(apiError(e), "error");
    }
    setBusy(false);
  };
  const test = async () => {
    setBusy(true);
    try {
      notify((await CampaignServices.test({ phone: testPhone, message: "Hi {name}, this is a test offer from {shop}." })).message);
    } catch (e) {
      notify(apiError(e), "error");
    }
    setBusy(false);
  };

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <TextField fullWidth label={t("WhatsApp business number")} placeholder="98250 12345" value={form.wa_business_number} onChange={set("wa_business_number")} slotProps={{ input: { startAdornment: <InputAdornment position="start">+</InputAdornment> } }} helperText={t("The number customers see the offer from.")} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label={t("Phone number ID")} value={form.wa_phone_number_id} onChange={set("wa_phone_number_id")} helperText={t("From Meta › WhatsApp Manager › API setup")} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <SecretField label={t("Permanent access token")} isSet={w.token_set} value={form.wa_access_token} onChange={set("wa_access_token")} />
      </Grid>
      <Grid size={{ xs: 8 }}>
        <TextField fullWidth label={t("Approved template name")} placeholder="scoopiez_offer" value={form.wa_template_name} onChange={set("wa_template_name")} />
      </Grid>
      <Grid size={{ xs: 4 }}>
        <TextField fullWidth label={t("Language")} value={form.wa_template_lang} onChange={set("wa_template_lang")} />
      </Grid>
      <Grid size={12}>
        <FormControlLabel control={<Switch checked={form.wa_template_image} onChange={(e) => setForm({ ...form, wa_template_image: e.target.checked })} />} label={t("My template has an image header (send the offer picture)")} />
        <Typography variant="caption" color="text.secondary" component="div">
          {t("Template body example:")} <code>{"Hello {{1}} 👋\n\n{{2}}\n\nReply STOP to stop offers."}</code> — {"{{1}}"} = {t("customer name")}, {"{{2}}"} = {t("offer text")}
        </Typography>
      </Grid>
      <Grid size={12}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button variant="contained" onClick={() => save()} disabled={busy}>
            {t("Save")}
          </Button>
          {w.token_set && (
            <Button color="error" onClick={() => save({ clear_token: true })} disabled={busy}>
              {t("Remove token")}
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          {w.api_ready && (
            <>
              <TextField size="small" label={t("Test mobile")} value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
              <Button variant="outlined" onClick={test} disabled={busy || !testPhone}>
                {t("Send test")}
              </Button>
            </>
          )}
        </Stack>
      </Grid>
    </Grid>
  );
}

function EmailSetup({ settings, onSaved }) {
  const t = useT();
  const notify = useNotify();
  const e0 = settings.email;
  const [form, setForm] = useState({ ...e0, smtp_pass: "" });
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (ev) => setForm({ ...form, [k]: ev.target.value });

  const save = async () => {
    setBusy(true);
    try {
      const res = await CampaignServices.saveChannelSettings({ email: form });
      notify(t("Email settings saved"));
      setForm((f) => ({ ...f, smtp_pass: "" }));
      onSaved(res.data);
    } catch (e) {
      notify(apiError(e), "error");
    }
    setBusy(false);
  };
  const test = async () => {
    setBusy(true);
    try {
      notify((await CampaignServices.testEmail(testTo)).message);
    } catch (e) {
      notify(apiError(e), "error");
    }
    setBusy(false);
  };
  const hostinger = () => setForm((f) => ({ ...f, smtp_host: "smtp.hostinger.com", smtp_port: 465, smtp_secure: "ssl", smtp_user: f.smtp_user || f.from_email }));

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <Alert severity="info" action={<Button size="small" onClick={hostinger}>{t("Use Hostinger")}</Button>}>
          {t("Use your shop mailbox (e.g. offers@scoopiez.in). On Hostinger: server smtp.hostinger.com, port 465, SSL, user = mailbox email, password = mailbox password.")}
        </Alert>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label={t("SMTP server")} placeholder="smtp.hostinger.com" value={form.smtp_host} onChange={set("smtp_host")} />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <TextField fullWidth type="number" label={t("Port")} value={form.smtp_port} onChange={set("smtp_port")} />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <TextField select fullWidth label={t("Security")} value={form.smtp_secure} onChange={set("smtp_secure")}>
          <MenuItem value="ssl">{t("SSL (465)")}</MenuItem>
          <MenuItem value="tls">{t("TLS (587)")}</MenuItem>
          <MenuItem value="none">{t("None")}</MenuItem>
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label={t("Username (mailbox email)")} value={form.smtp_user} onChange={set("smtp_user")} autoComplete="off" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <SecretField label={t("Mailbox password")} isSet={e0.pass_set} value={form.smtp_pass} onChange={set("smtp_pass")} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label={t("From email")} placeholder="offers@scoopiez.in" value={form.from_email} onChange={set("from_email")} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label={t("From name")} placeholder="Scoopie'z Ice Cream" value={form.from_name} onChange={set("from_name")} />
      </Grid>
      <Grid size={12}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button variant="contained" onClick={save} disabled={busy}>
            {t("Save")}
          </Button>
          <Box sx={{ flex: 1 }} />
          {e0.ready && (
            <>
              <TextField size="small" label={t("Test email to")} value={testTo} onChange={(e) => setTestTo(e.target.value)} />
              <Button variant="outlined" onClick={test} disabled={busy || !testTo}>
                {t("Send test")}
              </Button>
            </>
          )}
        </Stack>
      </Grid>
    </Grid>
  );
}

function SmsSetup({ settings, onSaved }) {
  const t = useT();
  const notify = useNotify();
  const s0 = settings.sms;
  const [form, setForm] = useState({ ...s0, provider: s0.provider || "fast2sms", api_key: "" });
  const [testPhone, setTestPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (ev) => setForm({ ...form, [k]: ev.target.value });

  const save = async () => {
    setBusy(true);
    try {
      const res = await CampaignServices.saveChannelSettings({ sms: form });
      notify(t("SMS settings saved"));
      setForm((f) => ({ ...f, api_key: "" }));
      onSaved(res.data);
    } catch (e) {
      notify(apiError(e), "error");
    }
    setBusy(false);
  };
  const test = async () => {
    setBusy(true);
    try {
      notify((await CampaignServices.testSms(testPhone)).message);
    } catch (e) {
      notify(apiError(e), "error");
    }
    setBusy(false);
  };

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField select fullWidth label={t("SMS provider")} value={form.provider} onChange={set("provider")}>
          <MenuItem value="fast2sms">{t("Fast2SMS")}</MenuItem>
          <MenuItem value="custom">{t("Other provider (HTTP API)")}</MenuItem>
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <SecretField label={t("API key")} isSet={s0.key_set} value={form.api_key} onChange={set("api_key")} />
      </Grid>
      {form.provider === "custom" && (
        <>
          <Grid size={12}>
            <Alert severity="info">{t("Use these in the URL / body: {phone} (91XXXXXXXXXX), {phone10}, {message}, {sender}, {api_key}")}</Alert>
          </Grid>
          <Grid size={{ xs: 12, sm: 9 }}>
            <TextField fullWidth label={t("API URL")} placeholder="https://api.provider.com/send?apikey={api_key}&to={phone}&text={message}" value={form.custom_url} onChange={set("custom_url")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField select fullWidth label={t("Method")} value={form.custom_method} onChange={set("custom_method")}>
              <MenuItem value="GET">{t("GET")}</MenuItem>
              <MenuItem value="POST">{t("POST")}</MenuItem>
            </TextField>
          </Grid>
          {form.custom_method === "POST" && (
            <Grid size={12}>
              <TextField fullWidth multiline minRows={2} label={t("Body (JSON or form)")} placeholder='{"to":"{phone}","text":"{message}","sender":"{sender}"}' value={form.custom_body} onChange={set("custom_body")} />
            </Grid>
          )}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth multiline label={t("Headers (one per line)")} placeholder="Authorization: Bearer {api_key}" value={form.custom_headers} onChange={set("custom_headers")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={t("Success text in reply (optional)")} placeholder='"status":"success"' value={form.success_text} onChange={set("success_text")} />
          </Grid>
        </>
      )}
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label={t("Sender ID (DLT)")} placeholder="SCOOPZ" value={form.sender_id} onChange={set("sender_id")} />
      </Grid>
      <Grid size={12}>
        <Typography variant="caption" color="text.secondary">
          {t("In India promotional SMS need a DLT-registered sender and template with your provider. Pictures are sent as a link in SMS.")}
        </Typography>
      </Grid>
      <Grid size={12}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button variant="contained" onClick={save} disabled={busy}>
            {t("Save")}
          </Button>
          <Box sx={{ flex: 1 }} />
          {s0.ready && (
            <>
              <TextField size="small" label={t("Test mobile")} value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
              <Button variant="outlined" onClick={test} disabled={busy || !testPhone}>
                {t("Send test")}
              </Button>
            </>
          )}
        </Stack>
      </Grid>
    </Grid>
  );
}

function Setup({ settings, onSaved }) {
  const t = useT();
  const [tab, setTab] = useState("whatsapp");
  const merge = (patch) => onSaved({ ...settings, ...patch });
  const status = (ok) => <Chip size="small" color={ok ? "success" : "default"} label={ok ? t("Ready") : t("Not set up")} sx={{ ml: 1 }} />;
  return (
    <Card>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tab value="whatsapp" icon={CHANNEL_ICON.whatsapp} iconPosition="start" label={<span>WhatsApp{status(settings.whatsapp.api_ready)}</span>} />
        <Tab value="email" icon={CHANNEL_ICON.email} iconPosition="start" label={<span>Email{status(settings.email.ready)}</span>} />
        <Tab value="sms" icon={CHANNEL_ICON.sms} iconPosition="start" label={<span>SMS{status(settings.sms.ready)}</span>} />
      </Tabs>
      <CardContent>
        {tab === "whatsapp" && <WhatsAppSetup settings={settings} onSaved={merge} />}
        {tab === "email" && <EmailSetup settings={settings} onSaved={merge} />}
        {tab === "sms" && <SmsSetup settings={settings} onSaved={merge} />}
      </CardContent>
    </Card>
  );
}

export default function Offers() {
  const t = useT();
  const notify = useNotify();
  const { can } = useAuth();
  const [tab, setTab] = useState(can("marketing", "add") ? "new" : "history");
  const [settings, setSettings] = useState(null);
  const [open, setOpen] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    CampaignServices.channelSettings()
      .then((r) => setSettings(r.data))
      .catch((e) => notify(apiError(e), "error"));
  }, [notify]);

  return (
    <Box>
      <PageHeader title="Offers & Messages" subtitle="Send offers to your customers on WhatsApp, Email and SMS in one click" />
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
          {can("marketing", "add") && <Tab value="new" icon={<CampaignIcon />} iconPosition="start" label={t("New offer")} />}
          <Tab value="history" label={t("Sent offers")} />
          {can("marketing", "edit") && <Tab value="setup" icon={<SettingsIcon />} iconPosition="start" label={t("Channels setup")} />}
        </Tabs>
      </Paper>
      {settings && tab === "new" && (
        <NewOffer
          settings={settings}
          onSetup={() => setTab("setup")}
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
