import { useEffect, useState } from "react";
import { Autocomplete, Box, Button, Grid, TextField, Typography } from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { CustomerServices } from "../../services/CustomerServices";
import useDebounce from "../../hooks/useDebounce";
import CustomerQuickAdd from "./CustomerQuickAdd";
import { useT } from "../../context/PrefsContext";

/**
 * Select a saved customer (search by name / phone / GSTIN) or type a walk-in name + mobile.
 * value = { customer: object|null, customer_name, customer_phone }
 */
export default function CustomerPicker({ value, onChange, required = false, allowWalkIn = true }) {
  const t = useT();
  const [input, setInput] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const term = useDebounce(input, 300);

  useEffect(() => {
    let active = true;
    setLoading(true);
    CustomerServices.getCustomersData(0, 20, term)
      .then((res) => active && setOptions(res.data || []))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [term]);

  const selected = value.customer;

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
        <Autocomplete
          sx={{ flex: 1 }}
          options={options}
          loading={loading}
          value={selected}
          filterOptions={(x) => x}
          isOptionEqualToValue={(a, b) => a.customer_id === b.customer_id}
          getOptionLabel={(o) => [o.company_name || o.name, o.phone].filter(Boolean).join(" · ")}
          onInputChange={(_, v, reason) => reason === "input" && setInput(v)}
          onChange={(_, c) => onChange({ customer: c, customer_name: c ? c.company_name || c.name : "", customer_phone: c?.phone || "" })}
          renderOption={(props, o) => {
            const { key, ...rest } = props;
            return (
              <li key={key} {...rest}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {o.company_name || o.name} {o.customer_type === "B2B" && <Typography component="span" variant="caption" color="primary">· B2B</Typography>}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {[o.phone, o.gstin, o.city].filter(Boolean).join(" · ") || "—"}
                  </Typography>
                </Box>
              </li>
            );
          }}
          renderInput={(params) => (
            <TextField {...params} label={required ? `${t("Customer")} *` : t("Customer (search name / mobile / GSTIN)")} placeholder={t("Search saved customers")} />
          )}
        />
        <Button variant="outlined" onClick={() => setAddOpen(true)} sx={{ minWidth: 0, px: 1.5, height: 40 }} aria-label="New customer">
          <PersonAddIcon fontSize="small" />
        </Button>
      </Box>
      {selected?.gstin && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
          GSTIN {selected.gstin} · {selected.state || "State not set"}
        </Typography>
      )}
      {!selected && allowWalkIn && (
        <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label={t("Walk-in name")} value={value.customer_name} onChange={(e) => onChange({ ...value, customer_name: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label={t("Mobile")}
              value={value.customer_phone}
              onChange={(e) => onChange({ ...value, customer_phone: e.target.value.replace(/[^0-9+ ]/g, "") })}
              slotProps={{ htmlInput: { inputMode: "tel", maxLength: 15 } }}
            />
          </Grid>
        </Grid>
      )}
      <CustomerQuickAdd
        open={addOpen}
        initialName={input}
        onClose={() => setAddOpen(false)}
        onCreated={(c) => {
          setAddOpen(false);
          setOptions((o) => [c, ...o]);
          onChange({ customer: c, customer_name: c.company_name || c.name, customer_phone: c.phone || "" });
        }}
      />
    </Box>
  );
}
