import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Pagination,
  Stack,
  Tab,
  Tabs,
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
import { CampaignServices } from "../../services/CampaignServices";
import { apiError } from "../../utils/format";

const PAGE = 20;
const waLink = (phone, text) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

/** Shows a campaign's progress. API campaigns send automatically while this is open; manual ones send one tap at a time. */
export default function CampaignDialog({ campaignId, onClose }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const notify = useNotify();
  const { can } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [list, setList] = useState({ data: [], total: 0 });
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [sending, setSending] = useState(false);
  const stopRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await CampaignServices.get(campaignId, { status: filter, page, limit: PAGE });
      setCampaign(res.data);
      setList(res.recipients);
    } catch (e) {
      notify(apiError(e), "error");
    }
  }, [campaignId, filter, page, notify]);
  useEffect(() => {
    load();
  }, [load]);

  // Automatic sending through the WhatsApp API, 20 messages per request.
  const runApi = useCallback(async () => {
    setSending(true);
    stopRef.current = false;
    try {
      for (let i = 0; i < 1000 && !stopRef.current; i++) {
        const res = await CampaignServices.sendBatch(campaignId);
        setCampaign((c) => ({ ...c, ...res.data }));
        if (!res.processed || res.data.pending === 0 || res.data.status !== "Sending") break;
      }
    } catch (e) {
      notify(apiError(e), "error");
    }
    setSending(false);
    load();
  }, [campaignId, load, notify]);

  const autoStarted = useRef(false);
  useEffect(() => {
    if (campaign && !autoStarted.current && campaign.channel === "api" && campaign.status === "Sending" && campaign.pending > 0 && can("marketing", "add")) {
      autoStarted.current = true;
      runApi();
    }
  }, [campaign, runApi, can]);
  useEffect(() => () => (stopRef.current = true), []);

  const act = async (action) => {
    try {
      if (action === "stop") stopRef.current = true;
      const res = await CampaignServices.action(campaignId, action);
      setCampaign((c) => ({ ...c, ...res.data }));
      if (action !== "stop" && campaign.channel === "api") runApi();
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
      const res = await CampaignServices.get(campaignId, { status: "Pending", page: 1, limit: 1 });
      const r = res.recipients.data[0];
      if (r) return mark(r, "Sent", win);
      win?.close();
      notify("Everyone has been sent this offer");
    } catch (e) {
      win?.close();
      notify(apiError(e), "error");
    }
  };

  const done = campaign ? campaign.sent + campaign.failed : 0;
  const percent = campaign?.total ? Math.round((done / campaign.total) * 100) : 0;
  const manual = campaign?.channel === "manual";

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" fullScreen={fullScreen}>
      <DialogTitle sx={{ pr: 6 }}>
        {campaign?.name || "Offer"}
        <IconButton onClick={onClose} sx={{ position: "absolute", right: 8, top: 8 }} aria-label="Close">
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
                <b>{campaign.sent}</b> sent · <b>{campaign.failed}</b> failed · <b>{campaign.total}</b> customers
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {manual ? "Sent from your WhatsApp" : "WhatsApp Business API"}
              </Typography>
            </Stack>
            <LinearProgress variant="determinate" value={percent} sx={{ height: 8, borderRadius: 4, mb: 2 }} />
            {sending && <Alert severity="info" sx={{ mb: 2 }}>Sending… keep this window open. You can close it any time and resume later.</Alert>}
            {manual && campaign.status === "Sending" && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Open WhatsApp on this device with your business number logged in (WhatsApp Web or app). Tap <b>Send next</b>, press send
                in WhatsApp, then come back for the next customer.
              </Alert>
            )}
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", bgcolor: "action.hover", p: 1.5, borderRadius: 1, mb: 2 }}>
              {campaign.message}
            </Typography>
            <Tabs
              value={filter}
              onChange={(_, v) => {
                setFilter(v);
                setPage(1);
              }}
              variant="scrollable"
              allowScrollButtonsMobile
            >
              <Tab value="" label="All" />
              <Tab value="Pending" label="Pending" />
              <Tab value="Sent" label="Sent" />
              <Tab value="Failed" label="Failed" />
            </Tabs>
            <List dense>
              {list.data.map((r) => (
                <ListItem
                  key={r.recipient_id}
                  divider
                  secondaryAction={
                    manual && r.status === "Pending" && can("marketing", "add") ? (
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Open WhatsApp with this message">
                          <IconButton color="success" onClick={() => mark(r, "Sent")} aria-label="Send on WhatsApp">
                            <WhatsAppIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Skip">
                          <IconButton onClick={() => mark(r, "Skipped")} aria-label="Skip">
                            <SkipNextIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ) : (
                      <StatusChip status={r.status} />
                    )
                  }
                >
                  <ListItemText
                    primary={r.name || "Customer"}
                    secondary={r.error ? `+${r.phone} · ${r.error}` : `+${r.phone}`}
                    slotProps={{ secondary: { sx: { color: r.error ? "error.main" : undefined } } }}
                    sx={{ pr: manual ? 10 : 9 }}
                  />
                </ListItem>
              ))}
              {list.data.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
                  No customers here.
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
          {campaign.status === "Sending" && !sending && (
            <Button color="inherit" onClick={() => act("stop")}>
              Stop
            </Button>
          )}
          {sending && (
            <Button color="inherit" onClick={() => act("stop")}>
              Stop sending
            </Button>
          )}
          {campaign.status === "Stopped" && <Button onClick={() => act("resume")}>Resume</Button>}
          {campaign.failed > 0 && !sending && <Button onClick={() => act("retry_failed")}>Retry failed ({campaign.failed})</Button>}
          {manual && campaign.status === "Sending" && (
            <Button variant="contained" color="success" startIcon={<WhatsAppIcon />} onClick={nextPending}>
              Send next
            </Button>
          )}
          {!manual && campaign.status === "Sending" && !sending && (
            <Button variant="contained" onClick={runApi}>
              Continue sending
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
}
