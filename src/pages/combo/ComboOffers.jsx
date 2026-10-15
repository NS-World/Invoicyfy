import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Card, CardActions, CardContent, Chip, Grid, IconButton, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PageHeader from "../../components/common/PageHeader";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import StorePicker from "../../components/v3/StorePicker";
import useStoreId from "../../hooks/useStoreId";
import useCatalog from "../../hooks/useCatalog";
import { ComboServices } from "../../services/V4Services";
import { useAuth } from "../../context/useAuth";
import { useNotify } from "../../context/NotifyProvider";
import { useT } from "../../context/PrefsContext";
import { apiError, formatCurrency, formatDate } from "../../utils/format";
import ComboDialog from "./ComboDialog";
import { DAYS } from "../../utils/v4";

/** Combo and happy-hour offers that apply on their own in Quick Bill. */
export default function ComboOffers() {
  const t = useT();
  const notify = useNotify();
  const { can } = useAuth();
  const [storeId, setStoreId] = useStoreId();
  const catalog = useCatalog(storeId);
  const [offers, setOffers] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const categories = useMemo(() => catalog.categories.map((c) => c.name).filter(Boolean), [catalog.categories]);

  const load = useCallback(() => {
    if (!storeId) return;
    ComboServices.list(storeId)
      .then((r) => setOffers(r.data))
      .catch((e) => notify(apiError(e), "error"));
  }, [storeId, notify]);
  useEffect(() => {
    load();
  }, [load]);

  const remove = async () => {
    try {
      const res = await ComboServices.remove(toDelete.offer_id);
      notify(t(res.message));
      load();
    } catch (e) {
      notify(apiError(e), "error");
    }
    setToDelete(null);
  };
  const when = (o) =>
    [
      o.days.length === 7 ? t("Every day") : o.days.split("").map((d) => t(DAYS[d])).join(", "),
      o.start_time ? `${o.start_time}–${o.end_time}` : t("all day"),
      o.valid_from || o.valid_to ? `${o.valid_from ? formatDate(o.valid_from, "short") : "…"} – ${o.valid_to ? formatDate(o.valid_to, "short") : "…"}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <>
      <PageHeader
        title="Combo & happy hour"
        subtitle="Automatic offers on the bill: combo price or % off at certain hours"
        actions={
          <>
            <StorePicker value={storeId} onChange={setStoreId} />
            {can("loyalty", "add") && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({ offer: null })}>
                {t("New offer")}
              </Button>
            )}
          </>
        }
      />
      {offers && offers.length === 0 && <Alert severity="info">{t("No offers yet. Example: \"2 Scoop + 1 Shake = ₹199\" or \"3 to 5 pm: 10% off on shakes\".")}</Alert>}
      <Grid container data-tour="screen-main" spacing={2}>
        {(offers || []).map((o) => (
          <Grid key={o.offer_id} size={{ xs: 12, sm: 6, lg: 4 }}>
            <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column", opacity: o.is_active ? 1 : 0.6 }}>
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
                  {o.offer_type === "combo" ? <LocalOfferIcon color="secondary" /> : <AccessTimeIcon color="primary" />}
                  <Typography sx={{ fontWeight: 800, flex: 1 }}>{o.name}</Typography>
                  {o.running_now ? <Chip size="small" color="success" label={t("Running now")} /> : <Chip size="small" label={o.is_active ? t("Not now") : t("Off")} />}
                </Box>
                {o.offer_type === "combo" ? (
                  <Typography variant="body2">
                    {o.combo_items.map((c) => `${c.qty} × ${c.name}`).join(" + ")} = <b>{formatCurrency(o.combo_price)}</b>
                  </Typography>
                ) : (
                  <Typography variant="body2">
                    <b>{o.discount_percent}%</b> {t("off on")} {o.applies_to === "all" ? t("every item") : o.applies_to === "category" ? o.target_ids.join(", ") : `${o.target_ids.length} ${t("items")}`}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  {when(o)}
                  {o.min_bill > 0 ? ` · ${t("min bill")} ${formatCurrency(o.min_bill)}` : ""}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("Used on {n} bill(s)", { n: o.used_count })}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: "flex-end" }}>
                {can("loyalty", "edit") && (
                  <Tooltip title={t("Edit")}>
                    <IconButton size="small" color="primary" onClick={() => setDialog({ offer: o })}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {can("loyalty", "delete") && (
                  <Tooltip title={t("Delete")}>
                    <IconButton size="small" color="error" onClick={() => setToDelete(o)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      {dialog && (
        <ComboDialog
          offer={dialog.offer}
          storeId={storeId}
          products={catalog.products.filter((p) => !Number(p.is_ingredient))}
          categories={categories}
          onClose={() => setDialog(null)}
          onSaved={(res) => {
            setDialog(null);
            notify(t(res.message));
            load();
          }}
        />
      )}
      <ConfirmationDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title={t("Delete offer?")}
        message={toDelete?.name || ""}
        cancelLabel="Cancel"
        confirmLabel="Delete"
      />
    </>
  );
}
