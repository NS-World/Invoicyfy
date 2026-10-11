import { useEffect, useState } from "react";
import { Alert, Box, Button, Paper } from "@mui/material";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import StoreFields from "../../components/forms/StoreFields";
import { blankStore, storeFromApi, storeInvalid } from "../../components/forms/storeForm";
import { StoreServices } from "../../services/StoreServices";
import { clearStoreCache } from "../../hooks/useStores";
import { useNotify } from "../../context/NotifyProvider";
import { apiError } from "../../utils/format";

export default function StoreForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const notify = useNotify();
  const storeId = params.get("id") || location.state?.storeData?.store_id || null;
  const [form, setForm] = useState(blankStore);
  const [loading, setLoading] = useState(Boolean(storeId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!storeId) return;
    StoreServices.getStoreDataFromId(storeId)
      .then((res) => setForm(storeFromApi(res.data)))
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, [storeId]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (storeId) await StoreServices.updateStoreData({ ...form, store_id: storeId });
      else await StoreServices.postStoreData(form);
      clearStoreCache();
      notify(storeId ? "Store updated" : "Store added");
      navigate("/stores");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;
  return (
    <Box component="form" onSubmit={submit} sx={{ maxWidth: 900, mx: "auto" }}>
      <PageHeader title={storeId ? "Edit Store" : "Add Store"} back="/stores" />
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <StoreFields form={form} setForm={setForm} />
        <Box sx={{ display: "flex", gap: 1, mt: 3, justifyContent: "flex-end" }}>
          <Button variant="outlined" onClick={() => navigate("/stores")}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saving || storeInvalid(form)}>
            {saving ? "Saving..." : storeId ? "Update Store" : "Add Store"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
