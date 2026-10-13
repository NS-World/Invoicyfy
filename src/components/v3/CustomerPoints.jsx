import { useCallback, useEffect, useState } from "react";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, TextField, Typography } from "@mui/material";
import StarsIcon from "@mui/icons-material/Stars";
import { LoyaltyServices } from "../../services/V3Services";
import { useAuth } from "../../context/useAuth";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { apiError, formatCurrency, formatDate, formatNumber } from "../../utils/format";

const TYPE_COLOR = { earn: "success", redeem: "warning", reverse: "default", adjust: "info" };

/** Loyalty points of one customer: balance, history and a manual correction. */
export default function CustomerPoints({ customerId }) {
  const t = useT();
  const notify = useNotify();
  const { can } = useAuth();
  const [data, setData] = useState(null);
  const [adjust, setAdjust] = useState(false);
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const load = useCallback(() => {
    LoyaltyServices.customer(customerId)
      .then((r) => setData(r.data))
      .catch(() => {});
  }, [customerId]);
  useEffect(() => {
    load();
  }, [load]);
  if (!data) return null;

  const save = async () => {
    try {
      const res = await LoyaltyServices.adjust({ customer_id: customerId, points: Number(points), note });
      notify(t(res.message));
      setAdjust(false);
      setPoints("");
      setNote("");
      load();
    } catch (e) {
      notify(apiError(e), "error");
    }
  };

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, mt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <StarsIcon color="warning" />
        <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
          {t("Loyalty points")}: {formatNumber(data.points, 0)}{" "}
          <Typography component="span" color="text.secondary">
            ({formatCurrency(data.value)})
          </Typography>
        </Typography>
        {!data.enabled && <Chip size="small" label={t("Loyalty is off")} />}
        {can("loyalty", "add") && (
          <Button size="small" variant="outlined" onClick={() => setAdjust(true)}>
            {t("Add / remove points")}
          </Button>
        )}
      </Box>
      {data.history.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t("No points yet")}
        </Typography>
      ) : (
        <Box sx={{ mt: 1, maxHeight: 280, overflowY: "auto" }}>
          {data.history.map((h) => (
            <Box key={h.entry_id} sx={{ display: "flex", justifyContent: "space-between", gap: 1, py: 0.75, borderTop: 1, borderColor: "divider" }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                  <Chip size="small" label={t(h.type)} color={TYPE_COLOR[h.type]} sx={{ mr: 1, height: 20 }} />
                  {h.note}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(h.created_at)} {h.user_name ? `· ${h.user_name}` : ""}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                <Typography sx={{ fontWeight: 700, color: h.points >= 0 ? "success.main" : "error.main" }}>
                  {h.points >= 0 ? "+" : ""}
                  {formatNumber(h.points, 0)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  = {formatNumber(h.balance_after, 0)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}
      {adjust && (
        <Dialog open onClose={() => setAdjust(false)} fullWidth maxWidth="xs">
          <DialogTitle>{t("Add / remove points")}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              type="number"
              label={t("Points (use minus to remove, e.g. -50)")}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              sx={{ mt: 1 }}
            />
            <TextField fullWidth label={t("Reason")} value={note} onChange={(e) => setNote(e.target.value)} sx={{ mt: 2 }} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAdjust(false)}>{t("Cancel")}</Button>
            <Button variant="contained" onClick={save} disabled={!Number(points) || !note.trim()}>
              {t("Save")}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Paper>
  );
}
