import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Pagination,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import StatusChip from "../../components/common/StatusChip";
import { useAuth } from "../../context/useAuth";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { CampaignServices } from "../../services/CampaignServices";
import { apiError } from "../../utils/format";
import { CHANNEL_ICON, CHANNEL_NAME } from "./channelMeta";

const PAGE = 20;
// api.whatsapp.com keeps emojis intact; the wa.me short link turns them into "�" on WhatsApp Desktop / Web.
const waLink = (phone, text) => `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;

/**
 * Campaign progress. Email, SMS and WhatsApp API messages go out automatically (this screen sends batches while
 * open and the server's cron job continues when it is closed). "From my WhatsApp" messages go one tap at a time.
 */
export default function CampaignDialog({ campaignId, onClose }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const notify = useNotify();
  const t = useT();
  const { can } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [list, setList] = useState({ data: [], total: 0 });
  const [filter, setFilter] = useState("");
  const [channel, setChannel] = useState("");
  const [page, setPage] = useState(1);
  const [sending, setSending] = useState(false);
  const stopRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await CampaignServices.get(campaignId, { status: filter, channel, page, limit: PAGE });
      setCampaign(res.data);
      setList(res.recipients);
    } catch (e) {
      notify(apiError(e), "error");
    }
  }, [campaignId, filter, channel, page, notify]);
  useEffect(() => {
    load();
  }, [load]);

  const manual = campaign?.channel === "manual";
  const channels = (campaign?.channels || "whatsapp").split(",");
  const hasAuto = channels.some((c) => c !== "whatsapp") || !manual;
  const autoPending = campaign?.by_channel?.filter((b) => b.channel !== "whatsapp" || !manual).reduce((s, b) => s + b.pending, 0) ?? 0;

  // Automatic channels: 20 messages per request until nothing automatic is left.
  const runAuto = useCallback(async () => {
    setSending(true);
    stopRef.current = false;
    try {
      for (let i = 0; i < 2000 && !stopRef.current; i++) {
        const res = await CampaignServices.sendBatch(campaignId);
        setCampaign((c) => ({ ...c, ...res.data }));
        if (!res.processed || !res.data.pending_auto || res.data.status !== "Sending") break;
      }
    } catch (e) {
      notify(apiError(e), "error");
    }
    setSending(false);
    load();
  }, [campaignId, load, notify]);

  const autoStarted = useRef(false);
  useEffect(() => {
    if (campaign && !autoStarted.current && hasAuto && campaign.status === "Sending" && autoPending > 0 && can("marketing", "add")) {
      autoStarted.current = true;
      runAuto();
    }
  }, [campaign, hasAuto, autoPending, runAuto, can]);
  useEffect(() => () => (stopRef.current = true), []);

  const act = async (action) => {
    try {
      if (action === "stop") stopRef.current = true;
      const res = await CampaignServices.action(campaignId, action);
      setCampaign((c) => ({ ...c, ...res.data }));
      if (action !== "stop" && hasAuto) runAuto();
      else load();
    } catch (e) {
      notify(apiError(e), "error");
    }
  };

  const mark = async (r, status, win) => {
    if (status === "Sent") {
      if (win) win.location.href = waLink(r.phone, r.text);
      else window.open(waLink(r.phone, r.text), "_blank", "noopener");
    }
    try {
      const res = await CampaignServices.mark(r.recipient_id, status);
      setCampaign((c) => ({ ...c, ...res.data }));
      setList((l) => ({ ...l, data: l.data.map((x) => (x.recipient_id === r.recipient_id ? { ...x, status } : x)) }));
    } catch (e) {
      notify(apiError(e), "error");
    }
  };

  const nextPending = async () => {
    // Open the tab during the click (browsers block pop-ups opened after a network call), then point it at WhatsApp.
    const win = window.open("about:blank", "_blank");
    if (win) win.opener = null;
    try {
      const res = await CampaignServices.get(campaignId, { status: "Pending", channel: "whatsapp", page: 1, limit: 1 });
      const r = res.recipients.data[0];
      if (r) return mark(r, "Sent", win);
      win?.close();
      notify(t("Everyone has been sent this offer"));
    } catch (e) {
      win?.close();
      notify(apiError(e), "error");
    }
  };

  const done = campaign ? campaign.sent + campaign.failed : 0;
  const percent = campaign?.total ? Math.round((done / campaign.total) * 100) : 0;
  const manualPending = manual && campaign?.by_channel?.find((b) => b.channel === "whatsapp")?.pending > 0;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" fullScreen={fullScreen}>
      <DialogTitle sx={{ pr: 6 }}>
        {campaign?.name || t("Offer")}
        <IconButton onClick={onClose} sx={{ position: "absolute", right: 8, top: 8 }} aria-label={t("Close")}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {!campaign ? (
          <LinearProgress />
        ) : (
          <>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", mb: 1 }} useFlexGap>
              <StatusChip status={campaign.status} />
              <Typography variant="body2">
                <b>{campaign.sent}</b> {t("sent")} · <b>{campaign.failed}</b> {t("failed")} · <b>{campaign.total}</b> {t("messages")}
              </Typography>
            </Stack>
            <LinearProgress variant="determinate" value={percent} sx={{ height: 8, borderRadius: 4, mb: 1.5 }} />
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
              {(campaign.by_channel || []).map((b) => (
                <Chip
                  key={b.channel}
                  icon={CHANNEL_ICON[b.channel]}
                  variant="outlined"
                  label={`${CHANNEL_NAME[b.channel]}${b.channel === "whatsapp" ? (manual ? ` (${t("my WhatsApp")})` : " (API)") : ""}: ${b.sent}/${b.total}${b.failed ? ` · ${b.failed} ${t("failed")}` : ""}`}
                />
              ))}
            </Box>
            {sending && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {t("Sending automatically… You can close this window — the server keeps sending in the background.")}
              </Alert>
            )}
            {manualPending && campaign.status === "Sending" && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {t("WhatsApp from your phone: open WhatsApp on this device with the business number logged in, tap Send next, press send in WhatsApp and come back.")}
              </Alert>
            )}
            {campaign.image_url && <Box component="img" src={campaign.image_url} alt="" sx={{ maxHeight: 160, maxWidth: "100%", borderRadius: 1, mb: 1 }} />}
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", bgcolor: "action.hover", p: 1.5, borderRadius: 1, mb: 2 }}>
              {campaign.message}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              <Tabs
                value={filter}
                onChange={(_, v) => {
                  setFilter(v);
                  setPage(1);
                }}
                variant="scrollable"
                allowScrollButtonsMobile
                sx={{ flex: 1, minWidth: 0 }}
              >
                <Tab value="" label={t("All")} />
                <Tab value="Pending" label={t("Pending")} />
                <Tab value="Sent" label={t("Sent")} />
                <Tab value="Failed" label={t("Failed")} />
              </Tabs>
              {channels.length > 1 && (
                <TextField
                  select
                  size="small"
                  value={channel}
                  onChange={(e) => {
                    setChannel(e.target.value);
                    setPage(1);
                  }}
                  sx={{ minWidth: 140 }}
                  label={t("Channel")}
                >
                  <MenuItem value="">{t("All")}</MenuItem>
                  {channels.map((c) => (
                    <MenuItem key={c} value={c}>
                      {CHANNEL_NAME[c]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Box>
            <List dense>
              {list.data.map((r) => {
                const tapToSend = manual && r.channel === "whatsapp" && r.status === "Pending" && can("marketing", "add");
                return (
                  <ListItem
                    key={r.recipient_id}
                    divider
                    secondaryAction={
                      tapToSend ? (
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title={t("Open WhatsApp with this message")}>
                            <IconButton color="success" onClick={() => mark(r, "Sent")} aria-label={t("Send on WhatsApp")}>
                              <WhatsAppIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t("Skip")}>
                            <IconButton onClick={() => mark(r, "Skipped")} aria-label={t("Skip")}>
                              <SkipNextIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      ) : (
                        <StatusChip status={r.status} />
                      )
                    }
                  >
                    <Box sx={{ color: "text.secondary", mr: 1.5, display: "flex" }}>{CHANNEL_ICON[r.channel || "whatsapp"]}</Box>
                    <ListItemText
                      primary={r.name || t("Customer")}
                      secondary={[r.email || (r.phone && `+${r.phone}`), r.error].filter(Boolean).join(" · ")}
                      slotProps={{ secondary: { sx: { color: r.error ? "error.main" : undefined, wordBreak: "break-word" } } }}
                      sx={{ pr: tapToSend ? 10 : 9 }}
                    />
                  </ListItem>
                );
              })}
              {list.data.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
                  {t("No customers here.")}
                </Typography>
              )}
            </List>
            {list.total > PAGE && (
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <Pagination count={Math.ceil(list.total / PAGE)} page={page} onChange={(_, p) => setPage(p)} size="small" />
              </Box>
            )}
          </>
        )}
      </DialogContent>
      {campaign && can("marketing", "add") && (
        <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
          {campaign.status === "Sending" && (
            <Button color="inherit" onClick={() => act("stop")}>
              {sending ? t("Stop sending") : t("Stop")}
            </Button>
          )}
          {campaign.status === "Stopped" && <Button onClick={() => act("resume")}>{t("Resume")}</Button>}
          {campaign.failed > 0 && !sending && (
            <Button onClick={() => act("retry_failed")}>
              {t("Retry failed")} ({campaign.failed})
            </Button>
          )}
          {manualPending && campaign.status === "Sending" && (
            <Button variant="contained" color="success" startIcon={<WhatsAppIcon />} onClick={nextPending}>
              {t("Send next")}
            </Button>
          )}
          {hasAuto && autoPending > 0 && campaign.status === "Sending" && !sending && (
            <Button variant="contained" onClick={runAuto}>
              {t("Continue sending")}
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
}
