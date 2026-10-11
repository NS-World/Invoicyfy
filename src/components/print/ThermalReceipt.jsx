import { formatDate, formatTime, formatNumber } from "../../utils/format";
import "./print.css";

const money = (v) => (Number(v) || 0).toFixed(2);

/**
 * 80mm / 58mm thermal receipt (retail bill) — layout follows the shop's existing printed bill:
 * PAID / Duplicate, shop name, customer, date + order type, cashier + bill no, items with notes,
 * totals, grand total, FSSAI number and footer.
 */
export default function ThermalReceipt({ invoice, copyLabel = "", width = "80mm" }) {
  const store = invoice.store || {};
  const items = invoice.items || [];
  const exclusiveTax = items.filter((i) => !Number(i.price_includes_tax)).reduce((s, i) => s + Number(i.tax_amount || 0), 0);
  const inclusiveTax = items.filter((i) => Number(i.price_includes_tax)).reduce((s, i) => s + Number(i.tax_amount || 0), 0);
  const statusLabel =
    invoice.status === "Paid" ? "PAID" : invoice.status === "Cancelled" ? "CANCELLED" : invoice.amount_paid > 0 ? "PARTLY PAID" : "UNPAID";
  const paymentModes = [...new Set((invoice.payments || []).map((p) => p.payment_method))].join(", ");
  const customer = [invoice.customer_name, invoice.customer_phone ? `(M: ${invoice.customer_phone})` : ""].filter(Boolean).join(" ");

  return (
    <div className={`receipt ${width === "58mm" ? "receipt-58" : "receipt-80"}`}>
      <div className="center bold big">{statusLabel}</div>
      {copyLabel && <div className="center">{copyLabel}</div>}
      <div className="center bold store-name">{store.name}</div>
      {store.tagline && <div className="center">{store.tagline}</div>}
      {store.address && <div className="center small">{[store.address, store.city].filter(Boolean).join(", ")}</div>}
      {store.phone && <div className="center small">Ph: {store.phone}</div>}
      {store.gstin && <div className="center small">GSTIN: {store.gstin}</div>}

      <hr />
      <div>Name: {customer || "Walk-in"}</div>
      {invoice.customer_gstin && <div className="small">GSTIN: {invoice.customer_gstin}</div>}
      <hr />

      <div className="row">
        <span>
          Date: {formatDate(invoice.invoice_date, "short")}
          <br />
          {formatTime(invoice.created_at)}
        </span>
        <span className="bold">{invoice.order_type || ""}</span>
      </div>
      <div className="row">
        <span>Cashier: {invoice.user_name || "-"}</span>
        <span>Bill No.: {invoice.invoice_number}</span>
      </div>
      <hr />

      <table className="items">
        <thead>
          <tr>
            <th className="left">Item</th>
            <th>Qty.</th>
            <th>Price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.invoice_item_id}>
              <td className="left" colSpan={4}>
                <div className="item-line">
                  <span className="item-name">{it.product_name}</span>
                  <span className="num qty">{formatNumber(it.quantity, 3)}</span>
                  <span className="num">{money(it.unit_price)}</span>
                  <span className="num">{money(Number(it.quantity) * Number(it.unit_price))}</span>
                </div>
                {it.item_note && <div className="note">{it.item_note}</div>}
                {Number(it.discount_amount) > 0 && <div className="note">Discount -{money(it.discount_amount)}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr />

      <div className="row">
        <span>Total Qty: {formatNumber(invoice.total_qty, 3)}</span>
        <span>
          Sub Total&nbsp;&nbsp;{money(invoice.subtotal)}
        </span>
      </div>
      {Number(invoice.discount_amount) > 0 && (
        <div className="row right-only">
          <span>Discount&nbsp;&nbsp;-{money(invoice.discount_amount)}</span>
        </div>
      )}
      {exclusiveTax > 0 &&
        (invoice.is_interstate ? (
          <div className="row right-only">
            <span>IGST&nbsp;&nbsp;{money(invoice.igst_amount)}</span>
          </div>
        ) : (
          <>
            <div className="row right-only">
              <span>CGST&nbsp;&nbsp;{money(invoice.cgst_amount)}</span>
            </div>
            <div className="row right-only">
              <span>SGST&nbsp;&nbsp;{money(invoice.sgst_amount)}</span>
            </div>
          </>
        ))}
      {Number(invoice.round_off) !== 0 && (
        <div className="row right-only">
          <span>Round Off&nbsp;&nbsp;{money(invoice.round_off)}</span>
        </div>
      )}
      <hr />
      <div className="row grand">
        <span />
        <span>
          Grand Total&nbsp;&nbsp;&nbsp;₹{money(invoice.total_amount)}
        </span>
      </div>
      {inclusiveTax > 0 && <div className="center small">(Incl. GST ₹{money(inclusiveTax)})</div>}
      {invoice.balance_due > 0 && invoice.status !== "Cancelled" && (
        <div className="center small">
          Paid ₹{money(invoice.amount_paid)} · Balance ₹{money(invoice.balance_due)}
        </div>
      )}
      {paymentModes && <div className="center small">Paid by: {paymentModes}</div>}
      <hr />
      {store.fssai_no && <div className="center">FSSAI Lic No. {store.fssai_no}</div>}
      <div className="center">{store.receipt_footer || "Thanks"}</div>
    </div>
  );
}
