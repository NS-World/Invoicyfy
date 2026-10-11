# Invoicyfy (Web App)

Responsive React app for small businesses: **Quick Bill / POS, orders, GST invoices, payments,
customers, products, inventory, expenses and reports**. Works on desktop, tablet and phones.
Backend: [Invoicyfy-Backend](https://github.com/NS-World/Invoicyfy-Backend).

## Setup

```bash
npm install
cp .env.example .env.local     # VITE_API_BASE_URL=http://localhost/invoice-api/
npm run dev                    # http://localhost:5173
npm run build                  # production build in dist/
```
The API's `CORS_ALLOWED_ORIGINS` must include the URL the app is served from.
When hosting `dist/` on Apache, add a rewrite so client routes (e.g. `/invoices/12`) serve `index.html`:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [L]
```

## Billing flow

1. **Quick Bill** (`/invoices/new`) — counter / delivery sale in one screen: pick or type the customer,
   add items, mark payment received, *Save & Print* → thermal receipt.
2. **Orders** — create an order, approve it, then *Generate Invoice* as a **Retail bill** (thermal receipt)
   or **GST tax invoice** (A4, for B2B).
3. **Invoice screen** — print 80 mm / 58 mm receipt, print / save A4 PDF (Original / Duplicate / Triplicate),
   share on WhatsApp, record part payments, cancel (stock is restored), add e-invoice IRN + QR.

## Printing

* Receipt layout follows the shop's thermal bill: PAID/Duplicate, shop name, customer + mobile, date/time,
  order type, cashier, bill no., items with notes, totals, grand total, FSSAI no. and footer.
* A4 tax invoice: seller & buyer GSTIN, place of supply, HSN/SAC, CGST/SGST or IGST, HSN summary,
  amount in words, bank details, UPI pay QR, signatory.
* Fill shop details once in **Business Settings** (GSTIN, FSSAI, bank, UPI, prefixes, terms, receipt footer).
* For thermal printers set the printer's paper size to 80 mm (or 58 mm) and margins to *None*.

## Code structure

| Folder | Contents |
| --- | --- |
| `src/pages` | One folder per module (dashboard, order, invoice, payment, customer, product, inventory, expense, report, settings, user, role, store) |
| `src/components/common` | `DataTable` (server-paginated, mobile-friendly), `PageHeader`, `StatCard`, `StatusChip`, filters |
| `src/components/billing` | Customer picker, items editor, totals, invoice & payment dialogs |
| `src/components/print` | `ThermalReceipt`, `TaxInvoiceA4`, `PrintPortal` + print CSS |
| `src/services` | Axios API layer (token refresh built in) |
| `src/hooks` | `useServerTable`, `useMeta`, `useStores`, `useDebounce` |
| `src/utils` | Formatting (₹, dates, amount in words, CSV) and GST maths mirroring the backend |

Pages are lazy-loaded; heavy libraries (data grid, charts, login animation) are separate chunks.
