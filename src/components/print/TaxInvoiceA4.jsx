import { QRCodeSVG } from "qrcode.react";
import { amountInWords, formatDate, formatNumber } from "../../utils/format";
import { DEFAULT_INVOICE_SETTINGS, a4Style, qrCodesFor } from "../../utils/invoiceSettings";
import { formatQty, rateSuffix } from "../../utils/weight";
import ExtraQrCodes from "./ExtraQrCodes";
import CustomBlocks from "./CustomBlocks";
import "./print.css";

const m = (v) => (Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v) => `${formatNumber(v, 2)}%`;

/**
 * A4 GST Tax Invoice ("pakka bill") for B2B: GSTIN of both parties, place of supply,
 * HSN-wise CGST/SGST or IGST, amount in words, bank details, UPI QR and e-invoice IRN/QR when available.
 * Look and sections come from the invoice designer settings; "classic" is the original layout.
 */
export default function TaxInvoiceA4({ invoice, copyLabel = "Original for Recipient", settings = DEFAULT_INVOICE_SETTINGS, template }) {
  const s = { ...DEFAULT_INVOICE_SETTINGS, ...settings };
  const tpl = template || s.a4_template || "classic";
  const store = invoice.store || {};
  const items = invoice.items || [];
  const igst = Boolean(invoice.is_interstate);
  const title = store.gstin ? s.title_tax || "TAX INVOICE" : s.title_retail || "INVOICE";
  const hsnCol = s.show_hsn_column;
  const discCol = s.show_discount_column;
  const upi =
    s.show_upi_qr && store.upi_id && invoice.balance_due > 0 && invoice.status !== "Cancelled"
      ? `upi://pay?pa=${encodeURIComponent(store.upi_id)}&pn=${encodeURIComponent(store.name || "")}&am=${Number(invoice.balance_due).toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Invoice ${invoice.invoice_number}`)}`
      : null;
  const sellerAddress = [store.address, store.city, store.state && `${store.state}${store.pincode ? ` - ${store.pincode}` : ""}`].filter(Boolean).join(", ");
  const extraQr = qrCodesFor(s, "a4");
  const bank = s.show_bank && (store.bank_name || store.bank_account_no);
  const showTerms = s.show_terms && (invoice.terms || invoice.notes);
  const leadCols = 2 + (hsnCol ? 1 : 0); // #, description, [hsn]
  const blocks = (position) => <CustomBlocks blocks={s.custom_blocks} position={position} format="a4" />;

  return (
    <div className={`a4 tpl-${tpl}`} style={a4Style(s)}>
      {invoice.status === "Cancelled" && <div className="watermark">CANCELLED</div>}
      {blocks("top")}
      <div className="a4-title">
        {s.show_logo && store.logo ? <img src={store.logo} alt="" className="a4-logo" /> : <span />}
        <h1>{title}</h1>
        <span className="copy">{copyLabel}</span>
      </div>
      {s.header_note && <div className="header-note">{s.header_note}</div>}
      {blocks("after_header")}

      {invoice.irn && (
        <div className="box irn">
          <div>
            <div>
              <b>IRN:</b> <span className="mono">{invoice.irn}</span>
            </div>
            <div>
              <b>Ack No:</b> {invoice.ack_no || "-"} &nbsp; <b>Ack Date:</b> {invoice.ack_date ? formatDate(invoice.ack_date) : "-"}
            </div>
          </div>
          {invoice.signed_qr && <QRCodeSVG value={invoice.signed_qr} size={92} level="L" />}
        </div>
      )}

      <div className="grid2 box first-box">
        <div className="cell">
          <div className="seller-name">{store.legal_name || store.name}</div>
          {store.legal_name && store.legal_name !== store.name && <div>({store.name})</div>}
          <div>{sellerAddress}</div>
          {store.gstin && (
            <div>
              <b>GSTIN/UIN:</b> {store.gstin}
            </div>
          )}
          {store.pan && (
            <div>
              <b>PAN:</b> {store.pan}
            </div>
          )}
          {store.state && (
            <div>
              <b>State:</b> {store.state} {store.state_code && `(Code: ${store.state_code})`}
            </div>
          )}
          {(store.phone || store.email) && <div>{[store.phone && `Ph: ${store.phone}`, store.email].filter(Boolean).join(" | ")}</div>}
          {s.show_fssai && store.fssai_no && <div>FSSAI: {store.fssai_no}</div>}
        </div>
        <div className="cell meta">
          <table>
            <tbody>
              <tr>
                <td>Invoice No.</td>
                <td>
                  <b>{invoice.invoice_number}</b>
                </td>
              </tr>
              <tr>
                <td>Invoice Date</td>
                <td>
                  <b>{formatDate(invoice.invoice_date)}</b>
                </td>
              </tr>
              {invoice.due_date && (
                <tr>
                  <td>Due Date</td>
                  <td>{formatDate(invoice.due_date)}</td>
                </tr>
              )}
              <tr>
                <td>Place of Supply</td>
                <td>{invoice.place_of_supply ? `${invoice.place_of_supply} (${invoice.place_of_supply_code})` : "-"}</td>
              </tr>
              <tr>
                <td>Reverse Charge</td>
                <td>{invoice.reverse_charge ? "Yes" : "No"}</td>
              </tr>
              {invoice.order_number && (
                <tr>
                  <td>Order No.</td>
                  <td>{invoice.order_number}</td>
                </tr>
              )}
              {invoice.eway_bill_no && (
                <tr>
                  <td>E-Way Bill No.</td>
                  <td>{invoice.eway_bill_no}</td>
                </tr>
              )}
              {invoice.vehicle_no && (
                <tr>
                  <td>Vehicle No.</td>
                  <td>{invoice.vehicle_no}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`box ${invoice.shipping_address ? "grid2" : ""}`}>
        <div className="cell">
          <div className="label">Bill To</div>
          <div className="party-name">{invoice.customer_name || "Cash Customer"}</div>
          {invoice.billing_address && <div>{invoice.billing_address}</div>}
          {invoice.customer_gstin && (
            <div>
              <b>GSTIN/UIN:</b> {invoice.customer_gstin}
            </div>
          )}
          {invoice.place_of_supply && (
            <div>
              <b>State:</b> {invoice.place_of_supply} (Code: {invoice.place_of_supply_code})
            </div>
          )}
          {s.show_customer_phone && invoice.customer_phone && <div>Ph: {invoice.customer_phone}</div>}
        </div>
        {invoice.shipping_address && (
          <div className="cell">
            <div className="label">Ship To</div>
            <div>{invoice.shipping_address}</div>
          </div>
        )}
      </div>

      {blocks("before_items")}
      <table className="lines">
        <thead>
          <tr>
            <th rowSpan={2}>#</th>
            <th rowSpan={2} className="left">
              Description of Goods / Services
            </th>
            {hsnCol && <th rowSpan={2}>HSN/SAC</th>}
            <th rowSpan={2}>Qty</th>
            <th rowSpan={2}>Rate</th>
            {discCol && <th rowSpan={2}>Disc.</th>}
            <th rowSpan={2}>Taxable Value</th>
            {igst ? (
              <th colSpan={2}>IGST</th>
            ) : (
              <>
                <th colSpan={2}>CGST</th>
                <th colSpan={2}>SGST</th>
              </>
            )}
            <th rowSpan={2}>Total</th>
          </tr>
          <tr>
            {(igst ? ["IGST"] : ["CGST", "SGST"]).map((t) => [<th key={`${t}r`}>Rate</th>, <th key={`${t}a`}>Amt</th>])}
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.invoice_item_id}>
              <td>{i + 1}</td>
              <td className="left">
                {it.product_name}
                {s.show_item_notes && it.item_note && <div className="note">{it.item_note}</div>}
              </td>
              {hsnCol && <td>{it.hsn_code || "-"}</td>}
              <td>{formatQty(it.quantity, it.unit)}</td>
              <td className="num">
                {m(it.unit_price)}
                {rateSuffix(it.unit)}
              </td>
              {discCol && <td className="num">{Number(it.discount_amount) ? m(it.discount_amount) : "-"}</td>}
              <td className="num">{m(it.taxable_value)}</td>
              {igst ? (
                <>
                  <td>{pct(it.igst_rate)}</td>
                  <td className="num">{m(it.igst_amount)}</td>
                </>
              ) : (
                <>
                  <td>{pct(it.cgst_rate)}</td>
                  <td className="num">{m(it.cgst_amount)}</td>
                  <td>{pct(it.sgst_rate)}</td>
                  <td className="num">{m(it.sgst_amount)}</td>
                </>
              )}
              <td className="num">{m(it.line_total)}</td>
            </tr>
          ))}
          <tr className="total-row">
            <td colSpan={leadCols} className="left">
              Total
            </td>
            <td>{items.length} item(s)</td>
            <td />
            {discCol && <td className="num">{Number(invoice.discount_amount) ? m(invoice.discount_amount) : "-"}</td>}
            <td className="num">{m(invoice.taxable_amount)}</td>
            {igst ? (
              <>
                <td />
                <td className="num">{m(invoice.igst_amount)}</td>
              </>
            ) : (
              <>
                <td />
                <td className="num">{m(invoice.cgst_amount)}</td>
                <td />
                <td className="num">{m(invoice.sgst_amount)}</td>
              </>
            )}
            <td className="num">{m(Number(invoice.taxable_amount) + Number(invoice.tax_amount))}</td>
          </tr>
        </tbody>
      </table>
      {blocks("after_items")}

      <div className="grid2 box">
        <div className="cell">
          {s.show_amount_in_words && (
            <>
              <div className="label">Amount Chargeable (in words)</div>
              <div className="bold">INR {amountInWords(invoice.total_amount)}</div>
              {Number(invoice.tax_amount) > 0 && <div style={{ marginTop: 4 }}>Tax amount (in words): INR {amountInWords(invoice.tax_amount)}</div>}
            </>
          )}
        </div>
        <div className="cell">
          <table className="totals">
            <tbody>
              <tr>
                <td>Taxable Amount</td>
                <td className="num">{m(invoice.taxable_amount)}</td>
              </tr>
              {igst ? (
                <tr>
                  <td>IGST</td>
                  <td className="num">{m(invoice.igst_amount)}</td>
                </tr>
              ) : (
                <>
                  <tr>
                    <td>CGST</td>
                    <td className="num">{m(invoice.cgst_amount)}</td>
                  </tr>
                  <tr>
                    <td>SGST</td>
                    <td className="num">{m(invoice.sgst_amount)}</td>
                  </tr>
                </>
              )}
              {Number(invoice.round_off) !== 0 && (
                <tr>
                  <td>Round Off</td>
                  <td className="num">{m(invoice.round_off)}</td>
                </tr>
              )}
              <tr className="grand-row">
                <td>Grand Total</td>
                <td className="num">₹ {m(invoice.total_amount)}</td>
              </tr>
              {invoice.amount_paid > 0 && (
                <>
                  <tr>
                    <td>Received</td>
                    <td className="num">{m(invoice.amount_paid)}</td>
                  </tr>
                  <tr>
                    <td>Balance Due</td>
                    <td className="num">{m(invoice.balance_due)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {s.show_hsn_summary && invoice.hsn_summary?.length > 0 && Number(invoice.tax_amount) > 0 && (
        <table className="lines hsn">
          <thead>
            <tr>
              <th className="left">HSN/SAC</th>
              <th>Taxable Value</th>
              {igst ? (
                <th>IGST</th>
              ) : (
                <>
                  <th>CGST</th>
                  <th>SGST</th>
                </>
              )}
              <th>Rate</th>
              <th>Total Tax</th>
            </tr>
          </thead>
          <tbody>
            {invoice.hsn_summary.map((h) => (
              <tr key={`${h.hsn_code}-${h.gst_rate}`}>
                <td className="left">{h.hsn_code}</td>
                <td className="num">{m(h.taxable_value)}</td>
                {igst ? (
                  <td className="num">{m(h.igst_amount)}</td>
                ) : (
                  <>
                    <td className="num">{m(h.cgst_amount)}</td>
                    <td className="num">{m(h.sgst_amount)}</td>
                  </>
                )}
                <td>{pct(h.gst_rate)}</td>
                <td className="num">{m(h.tax_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {blocks("after_totals")}
      <div className="grid2 box footer-box">
        <div className="cell">
          {bank && (
            <>
              <div className="label">Bank Details</div>
              {store.bank_account_name && <div>A/c Name: {store.bank_account_name}</div>}
              {store.bank_name && <div>Bank: {store.bank_name}</div>}
              {store.bank_account_no && <div>A/c No.: {store.bank_account_no}</div>}
              {store.bank_ifsc && (
                <div>
                  IFSC: {store.bank_ifsc} {store.bank_branch && `· ${store.bank_branch}`}
                </div>
              )}
            </>
          )}
          {upi && (
            <div className="upi">
              <QRCodeSVG value={upi} size={78} level="M" />
              <div>
                Scan to pay
                <br />
                <b>{store.upi_id}</b>
              </div>
            </div>
          )}
          {showTerms && (
            <div style={{ marginTop: 6 }}>
              {invoice.notes && (
                <div>
                  <b>Notes:</b> {invoice.notes}
                </div>
              )}
              {invoice.terms && (
                <>
                  <div className="label">Terms &amp; Conditions</div>
                  <div className="pre">{invoice.terms}</div>
                </>
              )}
            </div>
          )}
        </div>
        <div className="cell sign">
          {s.show_signature && (
            <>
              <div>
                For <b>{store.legal_name || store.name}</b>
              </div>
              <div className="sign-space" />
              <div>{s.signature_label || "Authorised Signatory"}</div>
            </>
          )}
        </div>
      </div>
      {blocks("bottom")}
      {extraQr.length > 0 && (
        <div className="box qr-box">
          <ExtraQrCodes codes={extraQr} size={76} />
        </div>
      )}
      {s.footer_note && (
        <div className="center small" style={{ marginTop: 6 }}>
          {s.footer_note}
        </div>
      )}
    </div>
  );
}
