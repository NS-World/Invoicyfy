import { formatDate, formatTime } from "../../utils/format";
import { DEFAULT_INVOICE_SETTINGS, qrCodesFor } from "../../utils/invoiceSettings";
import { formatQty, isWeightUnit, rateSuffix } from "../../utils/weight";
import ExtraQrCodes from "./ExtraQrCodes";
import "./print.css";

const money = (v) => (Number(v) || 0).toFixed(2);

/**
 * 80mm / 58mm thermal receipt (retail bill). The "classic" template follows the shop's existing printed bill:
 * PAID / Duplicate, shop name, customer, date + order type, cashier + bill no, items with notes,
 * totals, grand total, FSSAI number and footer. Templates and sections come from the invoice designer.
 */
export default function ThermalReceipt({ invoice, copyLabel = "", width = "80mm", settings = DEFAULT_INVOICE_SETTINGS, template }) {
  const s = { ...DEFAULT_INVOICE_SETTINGS, ...settings };
  const tpl = template || s.receipt_template || "classic";
  const detailed = tpl === "detailed";
  const store = invoice.store || {};
  const items = invoice.items || [];
  const exclusiveTax = items.filter((i) => !Number(i.price_includes_tax)).reduce((t, i) => t + Number(i.tax_amount || 0), 0);
  const inclusiveTax = items.filter((i) => Number(i.price_includes_tax)).reduce((t, i) => t + Number(i.tax_amount || 0), 0);
  const showTaxLines = s.show_tax_on_receipt && (exclusiveTax > 0 || (detailed && Number(invoice.tax_amount) > 0));
  const statusLabel =
    invoice.status === "Paid" ? "PAID" : invoice.status === "Cancelled" ? "CANCELLED" : invoice.amount_paid > 0 ? "PARTLY PAID" : "UNPAID";
  const paymentModes = [...new Set((invoice.payments || []).map((p) => p.payment_method))].join(", ");
  const customer = [invoice.customer_name, s.show_customer_phone && invoice.customer_phone ? `(M: ${invoice.customer_phone})` : ""].filter(Boolean).join(" ");
  const hasWeight = items.some((i) => isWeightUnit(i.unit));

  return (
    <div className={`receipt ${width === "58mm" ? "receipt-58" : "receipt-80"} rtpl-${tpl}`}>
      {s.show_status && <div className="center bold big">{statusLabel}</div>}
      {copyLabel && <div className="center">{copyLabel}</div>}
      {s.show_logo && store.logo && (
        <div className="center">
          <img src={store.logo} alt="" className="receipt-logo" />
        </div>
      )}
      <div className="center bold store-name">{store.name}</div>
      {store.tagline && <div className="center">{store.tagline}</div>}
      {s.show_address_on_receipt && store.address && <div className="center small">{[store.address, store.city].filter(Boolean).join(", ")}</div>}
      {s.show_address_on_receipt && store.phone && <div className="center small">Ph: {store.phone}</div>}
      {s.show_gstin_on_receipt && store.gstin && <div className="center small">GSTIN: {store.gstin}</div>}
      {s.receipt_header_note && <div className="center small note-line">{s.receipt_header_note}</div>}

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
        <span>{s.show_cashier ? `Cashier: ${invoice.user_name || "-"}` : ""}</span>
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
                  <span className="num qty">{formatQty(it.quantity, it.unit, { withUnit: isWeightUnit(it.unit) })}</span>
                  <span className="num">
                    {money(it.unit_price)}
                    {rateSuffix(it.unit)}
                  </span>
                  <span className="num">{money(Number(it.quantity) * Number(it.unit_price))}</span>
                </div>
                {detailed && (
                  <div className="note">
                    {[it.hsn_code && `HSN ${it.hsn_code}`, `GST ${Number(it.gst_rate)}%${Number(it.price_includes_tax) ? " incl." : ""}`].filter(Boolean).join(" · ")}
                  </div>
                )}
                {s.show_item_notes && it.item_note && <div className="note">{it.item_note}</div>}
                {Number(it.discount_amount) > 0 && <div className="note">Discount -{money(it.discount_amount)}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr />

      <div className="row">
        <span>{hasWeight ? `Items: ${items.length}` : `Total Qty: ${formatQty(invoice.total_qty, "", { withUnit: false })}`}</span>
        <span>
          Sub Total&nbsp;&nbsp;{money(invoice.subtotal)}
        </span>
      </div>
      {Number(invoice.discount_amount) > 0 && (
        <div className="row right-only">
          <span>Discount&nbsp;&nbsp;-{money(invoice.discount_amount)}</span>
        </div>
      )}
      {showTaxLines &&
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
      {s.show_tax_on_receipt && inclusiveTax > 0 && <div className="center small">(Incl. GST ₹{money(inclusiveTax)})</div>}
      {invoice.balance_due > 0 && invoice.status !== "Cancelled" && (
        <div className="center small">
          Paid ₹{money(invoice.amount_paid)} · Balance ₹{money(invoice.balance_due)}
        </div>
      )}
      {s.show_payment_mode && paymentModes && <div className="center small">Paid by: {paymentModes}</div>}
      <hr />
      {s.receipt_footer_note && <div className="center small note-line">{s.receipt_footer_note}</div>}
      {s.show_fssai && store.fssai_no && <div className="center">FSSAI Lic No. {store.fssai_no}</div>}
      <div className="center">{store.receipt_footer || "Thanks"}</div>
      <ExtraQrCodes codes={qrCodesFor(s, "receipt")} size={width === "58mm" ? 72 : 88} className="receipt-qr" />
    </div>
  );
}
