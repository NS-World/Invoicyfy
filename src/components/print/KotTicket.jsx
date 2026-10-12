import { formatDate, formatTime } from "../../utils/format";
import { DEFAULT_INVOICE_SETTINGS } from "../../utils/invoiceSettings";
import { formatQty, isWeightUnit } from "../../utils/weight";
import "./print.css";

/**
 * KOT (kitchen order ticket) for the shop's own staff: what to prepare, how much and any notes. No prices.
 * Works for a bill ({ invoice_number, ... }) or an order ({ order_number, ... }).
 */
export default function KotTicket({ doc, width = "80mm", settings = DEFAULT_INVOICE_SETTINGS }) {
  const s = { ...DEFAULT_INVOICE_SETTINGS, ...settings };
  const items = (doc.items || []).filter((it) => Number(it.quantity) > 0);
  const number = doc.order_number || doc.invoice_number;
  const ref = doc.order_number && doc.invoice_number ? `Bill ${doc.invoice_number}` : "";
  const narrow = width === "58mm";

  return (
    <div className={`receipt kot ${narrow ? "receipt-58" : "receipt-80"}${s.kot_large_text ? " kot-large" : ""}`}>
      <div className="center bold kot-title">KOT</div>
      {s.kot_show_store !== false && doc.store?.name && <div className="center small">{doc.store.name}</div>}
      <hr />
      <div className="row bold">
        <span>No. {number}</span>
        <span>{doc.order_type || ""}</span>
      </div>
      <div className="row small">
        <span>
          {formatDate(doc.created_at || doc.invoice_date || doc.order_date, "short")} {formatTime(doc.created_at)}
        </span>
        <span>{doc.user_name || ""}</span>
      </div>
      {ref && <div className="small">{ref}</div>}
      {s.kot_show_customer !== false && doc.customer_name && <div>Customer: {doc.customer_name}</div>}
      <hr />
      <div className="kot-grid">
        <div className="bold">Item</div>
        <div className="bold right">Qty</div>
        {items.map((it, i) => (
          <div className="kot-row" key={it.invoice_item_id || it.order_item_id || it.key || i}>
            <div className="kot-name">{it.product_name}</div>
            <div className="kot-qty">{formatQty(it.quantity, it.unit, { withUnit: isWeightUnit(it.unit) || (it.unit && it.unit !== "pcs") })}</div>
            {it.item_note && <div className="kot-note">» {it.item_note}</div>}
          </div>
        ))}
      </div>
      <hr />
      <div className="row">
        <span>Items: {items.length}</span>
        <span>{doc.status === "Cancelled" ? "CANCELLED" : ""}</span>
      </div>
      {doc.notes && <div className="kot-notes">Note: {doc.notes}</div>}
      <div className="center small kot-end">--- {narrow ? "kitchen" : "kitchen copy"} ---</div>
    </div>
  );
}
