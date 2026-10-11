import { Divider, Grid, MenuItem, TextField, Typography } from "@mui/material";
import useMeta from "../../hooks/useMeta";
import { storeInvalid } from "./storeForm";
import ImageUpload from "./ImageUpload";

const Section = ({ children }) => (
  <Grid size={12}>
    <Divider textAlign="left" sx={{ mt: 1 }}>
      <Typography variant="overline">{children}</Typography>
    </Divider>
  </Grid>
);

/** Business profile fields printed on bills and invoices. */
export default function StoreFields({ form, setForm }) {
  const meta = useMeta();
  const set = (k, transform) => (e) => setForm((f) => ({ ...f, [k]: transform ? transform(e.target.value) : e.target.value }));
  const upper = (v) => v.toUpperCase().trim();
  const gstinInvalid = storeInvalid(form);

  return (
    <Grid container spacing={2}>
      <Section>Business</Section>
      <Grid size={12}>
        <ImageUpload value={form.logo} onChange={(v) => setForm((f) => ({ ...f, logo: v }))} label="Logo" hint="Optional · shows on bills when turned on in Invoice Design" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth required label="Shop / brand name" value={form.name} onChange={set("name")} helperText="Printed at the top of receipts" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Tagline / sub-name" value={form.tagline} onChange={set("tagline")} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Legal name (as per GST)" value={form.legal_name} onChange={set("legal_name")} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Phone" value={form.phone} onChange={set("phone")} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth type="email" label="Email" value={form.email} onChange={set("email")} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Logo URL" value={form.logo_url} onChange={set("logo_url")} />
      </Grid>
      <Grid size={12}>
        <TextField fullWidth multiline minRows={2} label="Address" value={form.address} onChange={set("address")} />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField fullWidth label="City" value={form.city} onChange={set("city")} />
      </Grid>
      <Grid size={{ xs: 6, sm: 4 }}>
        <TextField select fullWidth label="State" value={form.state_code} onChange={set("state_code")}>
          <MenuItem value="">—</MenuItem>
          {meta.states.map((s) => (
            <MenuItem key={s.code} value={s.code}>
              {s.code} - {s.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid size={{ xs: 6, sm: 4 }}>
        <TextField fullWidth label="PIN code" value={form.pincode} onChange={set("pincode")} slotProps={{ htmlInput: { maxLength: 6, inputMode: "numeric" } }} />
      </Grid>

      <Section>Tax & licences</Section>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField
          fullWidth
          label="GSTIN"
          value={form.gstin}
          onChange={(e) => {
            const g = upper(e.target.value);
            setForm((f) => ({ ...f, gstin: g, state_code: /^\d\d/.test(g) ? g.slice(0, 2) : f.state_code, pan: g.length >= 12 && !f.pan ? g.slice(2, 12) : f.pan }));
          }}
          error={gstinInvalid}
          helperText={gstinInvalid ? "Format: 24ABCDE1234F1Z5" : "Leave empty if not registered"}
          slotProps={{ htmlInput: { maxLength: 15 } }}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 4 }}>
        <TextField fullWidth label="PAN" value={form.pan} onChange={set("pan", upper)} slotProps={{ htmlInput: { maxLength: 10 } }} />
      </Grid>
      <Grid size={{ xs: 6, sm: 4 }}>
        <TextField fullWidth label="FSSAI Lic No." value={form.fssai_no} onChange={set("fssai_no")} />
      </Grid>

      <Section>Invoice numbering</Section>
      <Grid size={{ xs: 6 }}>
        <TextField fullWidth label="Tax invoice prefix" value={form.invoice_prefix} onChange={set("invoice_prefix", upper)} helperText={`e.g. ${form.invoice_prefix || "INV"}/26-27/0001`} slotProps={{ htmlInput: { maxLength: 6 } }} />
      </Grid>
      <Grid size={{ xs: 6 }}>
        <TextField fullWidth label="Retail bill prefix" value={form.bill_prefix} onChange={set("bill_prefix", upper)} helperText={`e.g. Bill No. ${form.bill_prefix || ""}55`} slotProps={{ htmlInput: { maxLength: 6 } }} />
      </Grid>

      <Section>Bank & UPI (printed on invoices)</Section>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="UPI ID" placeholder="shop@upi" value={form.upi_id} onChange={set("upi_id")} helperText="A pay QR is printed on unpaid invoices" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Account holder name" value={form.bank_account_name} onChange={set("bank_account_name")} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Bank name" value={form.bank_name} onChange={set("bank_name")} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Account number" value={form.bank_account_no} onChange={set("bank_account_no")} />
      </Grid>
      <Grid size={{ xs: 6 }}>
        <TextField fullWidth label="IFSC" value={form.bank_ifsc} onChange={set("bank_ifsc", upper)} slotProps={{ htmlInput: { maxLength: 11 } }} />
      </Grid>
      <Grid size={{ xs: 6 }}>
        <TextField fullWidth label="Branch" value={form.bank_branch} onChange={set("bank_branch")} />
      </Grid>

      <Section>Footer text</Section>
      <Grid size={12}>
        <TextField fullWidth multiline minRows={3} label="Terms & conditions (A4 invoice)" value={form.invoice_terms} onChange={set("invoice_terms")} placeholder={"1. Goods once sold will not be taken back.\n2. Subject to local jurisdiction."} />
      </Grid>
      <Grid size={12}>
        <TextField fullWidth label="Receipt footer" value={form.receipt_footer} onChange={set("receipt_footer")} placeholder="Thanks" />
      </Grid>
    </Grid>
  );
}
