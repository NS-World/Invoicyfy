import { useCallback, useEffect, useState } from "react";
import { Badge, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItem, ListItemText, Tooltip, Typography } from "@mui/material";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { HeldServices } from "../../../services/V3Services";
import { useNotify } from "../../../context/NotifyProvider";
import { useT } from "../../../context/PrefsContext";
import { apiError, formatCurrency, formatTime } from "../../../utils/format";

/** "Held (3)" button + list to resume or discard parked bills. reloadKey changes after a new hold. */
export default function HeldBills({ storeId, onResume, reloadKey, onTablesBusy }) {
  const t = useT();
  const notify = useNotify();
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const load = useCallback(() => {
    if (!storeId) return;
    HeldServices.list(storeId)
      .then((r) => {
        setList(r.data || []);
        onTablesBusy?.((r.data || []).map((h) => h.table_no).filter(Boolean));
      })
      .catch(() => {});
  }, [storeId, onTablesBusy]);
  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const resume = async (h) => {
    try {
      const res = await HeldServices.get(h.held_id, storeId);
      await HeldServices.remove(h.held_id, storeId, true);
      setOpen(false);
      onResume(res.data.payload, h);
      load();
    } catch (e) {
      notify(apiError(e), "error");
      load();
    }
  };
  const discard = async (h) => {
    try {
      await HeldServices.remove(h.held_id, storeId);
      load();
    } catch (e) {
      notify(apiError(e), "error");
    }
  };

  return (
    <>
      <Badge badgeContent={list.length} color="warning">
        <Button variant="outlined" size="small" startIcon={<PauseCircleIcon />} onClick={() => setOpen(true)} data-tour="held-bills">
          {t("Held bills")}
        </Button>
      </Badge>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t("Bills on hold")}</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {list.length === 0 && (
            <Typography color="text.secondary" sx={{ p: 3, textAlign: "center" }}>
              {t("No bills on hold. Use Hold to park a bill and serve the next customer.")}
            </Typography>
          )}
          <List dense>
            {list.map((h) => (
              <ListItem
                key={h.held_id}
                divider
                secondaryAction={
                  <Box>
                    <Tooltip title={t("Discard")}>
                      <IconButton edge="end" color="error" onClick={() => discard(h)} sx={{ mr: 0.5 }}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                    <Button variant="contained" size="small" startIcon={<PlayArrowIcon />} onClick={() => resume(h)}>
                      {t("Resume")}
                    </Button>
                  </Box>
                }
              >
                <ListItemText
                  primary={[h.table_no && `${t("Table")} ${h.table_no}`, h.label, h.customer_name].filter(Boolean).join(" · ") || `${t("Bill")} #${h.held_id}`}
                  secondary={`${h.item_count} ${t("items")} · ${formatCurrency(h.total)} · ${formatTime(h.updated_at || h.created_at)} · ${h.user_name || ""}`}
                  sx={{ pr: 18 }}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t("Close")}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
