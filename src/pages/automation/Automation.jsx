import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  FormGroup,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SaveIcon from "@mui/icons-material/Save";
import CakeIcon from "@mui/icons-material/Cake";
import NightsStayIcon from "@mui/icons-material/NightsStay";
import InventoryIcon from "@mui/icons-material/Inventory";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import PersonIcon from "@mui/icons-material/Person";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import StorePicker from "../../components/v3/StorePicker";
import useStoreId from "../../hooks/useStoreId";
import { AutomationServices } from "../../services/V3Services";
import { useAuth } from "../../context/useAuth";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { apiError, formatDate, formatTime } from "../../utils/format";

const CHANNELS = [
  ["whatsapp", "WhatsApp (API)"],
  ["sms", "SMS"],
  ["email", "Email"],
];

function Section({ icon, title, hint, enabled, onToggle, children, action, tour }) {
  return (
    <Paper sx={{ p: { xs: 2, sm: 2.5 }, mb: 2 }} data-tour={tour}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, flexWrap: "wrap" }}>
        <Box sx={{ color: "primary.main", mt: 0.5 }}>{icon}</Box>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {hint}
          </Typography>
        </Box>
        {onToggle && <Switch checked={Boolean(enabled)} onChange={(e) => onToggle(e.target.checked)} />}
      </Box>
      {(enabled === undefined || enabled) && <Box sx={{ mt: 2 }}>{children}</Box>}
      {action && <Box sx={{ mt: 1.5 }}>{action}</Box>}
    </Paper>
  );
}

/** Automatic messages: night summary + low stock alert to the owner, birthday wishes with a coupon, payment reminders. */
export default function Automation() {
  const t = useT();
  const notify = useNotify();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [storeId, setStoreId] = useStoreId();
  const [data, setData] = useState(null);
  const [s, setS] = useState(null);
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState("");
  const [dirty, setDirty] = useState(false);
  const canEdit = can("settings", "edit");

  const load = useCallback(() => {
    if (!storeId) return;
    AutomationServices.get(storeId)
      .then((r) => {
        setData(r.data);
        setS(r.data.settings);
        setDirty(false);
      })
      .catch((e) => notify(apiError(e), "error"));
    AutomationServices.history(storeId)
      .then((r) => setHistory(r.data))
      .catch(() => {});
  }, [storeId, notify]);
  useEffect(() => {
    load();
  }, [load]);

  if (!s) return <Loader />;
  const ready = data.channels_ready;
  const set = (path, value) => {
    setDirty(true);
    setS((x) => {
      const copy = structuredClone(x);
      const keys = path.split(".");
      let o = copy;
      keys.slice(0, -1).forEach((k) => (o = o[k]));
      o[keys.at(-1)] = value;
      return copy;
    });
  };
  const channelBoxes = (path, value) => (
    <FormGroup row>
      {CHANNELS.map(([k, l]) => (
        <FormControlLabel
          key={k}
          control={<Checkbox checked={value.includes(k)} onChange={(e) => set(path, e.target.checked ? [...value, k] : value.filter((c) => c !== k))} />}
          label={
            <span>
              {l} {!ready[k] && <Chip size="small" label={t("not set up")} sx={{ ml: 0.5, height: 18, fontSize: 10 }} />}
            </span>
          }
        />
      ))}
    </FormGroup>
  );
  const time = (path, value) => (
    <TextField size="small" type="time" label={t("Time")} value={value} onChange={(e) => set(path, e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 140 }} />
  );

  const save = async () => {
    setSaving(true);
    try {
      const res = await AutomationServices.save({ ...s, store_id: storeId });
      notify(t(res.message));
      setS(res.data);
      setDirty(false);
    } catch (e) {
      notify(apiError(e), "error");
    }
    setSaving(false);
  };
  const runNow = async (job) => {
    if (dirty) {
      notify(t("Save the changes first"), "warning");
      return;
    }
    setRunning(job);
    try {
      const res = await AutomationServices.runNow(storeId, job);
      notify(t(res.message));
      load();
    } catch (e) {
      notify(apiError(e), "error");
    }
    setRunning("");
  };
  const runBtn = (job, label) =>
    canEdit && (
      <Button size="small" variant="outlined" startIcon={<SendIcon />} onClick={() => runNow(job)} disabled={Boolean(running)}>
        {running === job ? t("Sending...") : t(label)}
      </Button>
    );
  const cronOld = !data.cron_last_run || Date.now() - new Date(String(data.cron_last_run).replace(" ", "T")).getTime() > 15 * 60 * 1000;
  const noChannel = !ready.whatsapp && !ready.sms && !ready.email;

  return (
    <Box sx={{ pb: 8 }}>
      <PageHeader
        title={t("Automatic Messages")}
        subtitle={t("Night summary, low stock alerts, birthday wishes and payment reminders — sent by themselves")}
        actions={
          <>
            <StorePicker value={storeId} onChange={setStoreId} />
            {canEdit && (
              <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving || !dirty}>
                {dirty ? t("Save") : t("Saved")}
              </Button>
            )}
          </>
        }
      />
      {noChannel && (
        <Alert severity="warning" sx={{ mb: 2 }} action={<Button onClick={() => navigate("/offers")}>{t("Set up")}</Button>}>
          {t("No sending channel is set up yet. Set up WhatsApp API, SMS or Email in Offers & Messages → Channels setup.")}
        </Alert>
      )}
      {cronOld && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t("Tip: add the cron job on your hosting so messages go out on time even when nobody has the app open. Until then they are sent while the app is open.")}
        </Alert>
      )}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <Section tour="auto-owner" icon={<PersonIcon />} title={t("Owner contacts")} hint={t("Where the night summary and stock alerts go")}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField fullWidth size="small" label={t("Name")} value={s.owner_name} onChange={(e) => set("owner_name", e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label={t("Mobile number(s)")}
                    placeholder="98250 12345, 98980 00000"
                    value={s.owner_phones}
                    onChange={(e) => set("owner_phones", e.target.value)}
                    helperText={t("Separate more than one with a comma")}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField fullWidth size="small" label={t("Email(s)")} value={s.owner_emails} onChange={(e) => set("owner_emails", e.target.value)} />
                </Grid>
                <Grid size={12}>{channelBoxes("owner_channels", s.owner_channels)}</Grid>
              </Grid>
            </Section>

            <Section
              icon={<NightsStayIcon />}
              title={t("Night summary")}
              hint={t("Every night: sales, cash / UPI, credit given, expenses, top items, cancelled bills")}
              enabled={s.summary.enabled}
              onToggle={(v) => set("summary.enabled", v)}
              action={runBtn("summary", "Send today's summary now")}
            >
              {time("summary.time", s.summary.time)}
            </Section>

            <Section
              icon={<InventoryIcon />}
              title={t("Low stock alert")}
              hint={t("Every day: items at or below their minimum stock")}
              enabled={s.low_stock.enabled}
              onToggle={(v) => set("low_stock.enabled", v)}
              action={runBtn("low_stock", "Send stock alert now")}
            >
              {time("low_stock.time", s.low_stock.time)}
            </Section>

            <Section
              icon={<CakeIcon />}
              title={t("Birthday & anniversary wishes")}
              hint={t("Customers with a birthday / anniversary today get a wish with their own one-time coupon")}
              enabled={s.birthday.enabled}
              onToggle={(v) => set("birthday.enabled", v)}
              action={runBtn("birthday", "Send today's wishes now")}
            >
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mb: 1 }}>{time("birthday.time", s.birthday.time)}</Box>
              {channelBoxes("birthday.channels", s.birthday.channels)}
              <TextField
                fullWidth
                multiline
                minRows={2}
                label={t("Birthday message")}
                value={s.birthday.message}
                onChange={(e) => set("birthday.message", e.target.value)}
                sx={{ mt: 1 }}
                helperText={t("{name}, {shop}, {coupon} and {valid_till} are filled in for each customer")}
              />
              <FormControlLabel
                sx={{ mt: 1 }}
                control={<Switch checked={Boolean(s.birthday.anniversary)} onChange={(e) => set("birthday.anniversary", e.target.checked)} />}
                label={t("Also wish on anniversaries")}
              />
              {s.birthday.anniversary && (
                <TextField fullWidth multiline minRows={2} label={t("Anniversary message")} value={s.birthday.anniversary_message} onChange={(e) => set("birthday.anniversary_message", e.target.value)} sx={{ mt: 1 }} />
              )}
              <Divider sx={{ my: 2 }} />
              <FormControlLabel
                control={<Switch checked={Boolean(s.birthday.coupon.enabled)} onChange={(e) => set("birthday.coupon.enabled", e.target.checked)} />}
                label={t("Give a personal coupon with the wish")}
              />
              {s.birthday.coupon.enabled && (
                <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <TextField select fullWidth size="small" label={t("Type")} value={s.birthday.coupon.discount_type} onChange={(e) => set("birthday.coupon.discount_type", e.target.value)}>
                      <MenuItem value="percent">{t("% off")}</MenuItem>
                      <MenuItem value="flat">{t("₹ off")}</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <TextField fullWidth size="small" type="number" label={t("Value")} value={s.birthday.coupon.value} onChange={(e) => set("birthday.coupon.value", e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <TextField fullWidth size="small" type="number" label={t("Minimum bill ₹")} value={s.birthday.coupon.min_bill} onChange={(e) => set("birthday.coupon.min_bill", e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label={t("Valid for")}
                      value={s.birthday.coupon.valid_days}
                      onChange={(e) => set("birthday.coupon.valid_days", e.target.value)}
                      slotProps={{ input: { endAdornment: <InputAdornment position="end">{t("days")}</InputAdornment> } }}
                    />
                  </Grid>
                </Grid>
              )}
            </Section>

            <Section
              icon={<NotificationsActiveIcon />}
              title={t("Payment reminders (udhaar)")}
              hint={t("Customers with dues get a polite reminder with the amount pending")}
              enabled={s.reminders.enabled}
              onToggle={(v) => set("reminders.enabled", v)}
              action={runBtn("reminders", "Send reminders now")}
            >
              <Grid container spacing={1.5} sx={{ mb: 1 }}>
                <Grid size={{ xs: 12, sm: 3 }}>{time("reminders.time", s.reminders.time)}</Grid>
                <Grid size={{ xs: 4, sm: 3 }}>
                  <TextField fullWidth size="small" type="number" label={t("Repeat every (days)")} value={s.reminders.every_days} onChange={(e) => set("reminders.every_days", e.target.value)} />
                </Grid>
                <Grid size={{ xs: 4, sm: 3 }}>
                  <TextField fullWidth size="small" type="number" label={t("After bill is (days) old")} value={s.reminders.min_days_due} onChange={(e) => set("reminders.min_days_due", e.target.value)} />
                </Grid>
                <Grid size={{ xs: 4, sm: 3 }}>
                  <TextField fullWidth size="small" type="number" label={t("Minimum due ₹")} value={s.reminders.min_amount} onChange={(e) => set("reminders.min_amount", e.target.value)} />
                </Grid>
              </Grid>
              {channelBoxes("reminders.channels", s.reminders.channels)}
              <TextField
                fullWidth
                multiline
                minRows={2}
                label={t("Reminder message")}
                value={s.reminders.message}
                onChange={(e) => set("reminders.message", e.target.value)}
                sx={{ mt: 1 }}
                helperText={t("{name}, {due}, {bills}, {oldest} and {shop} are filled in for each customer")}
              />
            </Section>
          </fieldset>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper sx={{ p: 2, position: { lg: "sticky" }, top: { lg: 16 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Recently sent")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("Server time")}: {data.server_time}
            </Typography>
            {history.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t("Nothing sent yet")}
              </Typography>
            )}
            {history.slice(0, 15).map((h) => (
              <Box key={h.campaign_id} sx={{ py: 1, borderTop: 1, borderColor: "divider", mt: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                    {h.name}
                  </Typography>
                  <Chip size="small" label={`${h.sent}/${h.total}`} color={h.failed ? "warning" : "success"} />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(h.created_at)} {formatTime(h.created_at)} · {h.channels}
                  {h.failed ? ` · ${h.failed} ${t("failed")}` : ""}
                </Typography>
              </Box>
            ))}
            {data.runs.length > 0 && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t("Job log")}
                </Typography>
                {data.runs
                  .filter((r) => r.job !== "cron" && !r.job.startsWith("v3_"))
                  .slice(0, 10)
                  .map((r) => (
                    <Typography key={`${r.job}${r.run_date}`} variant="caption" component="div" color="text.secondary">
                      {formatDate(r.run_date, "short")} · {r.job}: {r.result}
                    </Typography>
                  ))}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
