import { formatDate, formatTime } from "../../utils/format";
import { formatQty } from "../../utils/weight";
import "./print.css";

const money = (v) => (Number(v) || 0).toFixed(2);
const Row = ({ l, r, bold }) => (
  <div className={`row${bold ? " bold" : ""}`}>
    <span>{l}</span>
    <span>{r}</span>
  </div>
);

/** Day close slip (Z report) for the thermal printer. */
export default function ZReport({ session, storeName, width = "80mm" }) {
  const r = session.report || {};
  const closed = session.status === "Closed";
  const diff = Number(session.difference ?? r.difference ?? 0);
  return (
    <div className={`receipt ${width === "58mm" ? "receipt-58" : "receipt-80"}`}>
      <div className="center bold big">{closed ? "DAY CLOSE (Z)" : "DAY SUMMARY (X)"}</div>
      {storeName && <div className="center">{storeName}</div>}
      <hr />
      <Row l="Opened" r={`${formatDate(session.opened_at, "short")} ${formatTime(session.opened_at)}`} />
      {session.opened_by_name && <Row l="By" r={session.opened_by_name} />}
      {closed && <Row l="Closed" r={`${formatDate(session.closed_at, "short")} ${formatTime(session.closed_at)}`} />}
      {closed && session.closed_by_name && <Row l="By" r={session.closed_by_name} />}
      <hr />
      <Row l={`Bills (${r.bills?.count || 0})`} r={money(r.bills?.total)} bold />
      {Number(r.bills?.discount) > 0 && <Row l="Discounts" r={money(r.bills.discount)} />}
      {Number(r.bills?.coupon_discount) > 0 && <Row l="  of which coupons" r={money(r.bills.coupon_discount)} />}
      {Number(r.bills?.loyalty_discount) > 0 && <Row l="  of which points" r={money(r.bills.loyalty_discount)} />}
      {Number(r.bills?.credit_given) > 0 && <Row l="Credit (udhaar)" r={money(r.bills.credit_given)} />}
      {Number(r.cancelled?.count) > 0 && <Row l={`Cancelled (${r.cancelled.count})`} r={money(r.cancelled.total)} />}
      <hr />
      <div className="bold">Received</div>
      {(r.payments_by_method || []).map((m) => (
        <Row key={m.method} l={`${m.method} (${m.count})`} r={money(m.amount)} />
      ))}
      <Row l="Total received" r={money(r.received_total)} bold />
      <hr />
      <div className="bold">Cash drawer</div>
      <Row l="Opening cash" r={money(r.opening_cash)} />
      <Row l="+ Cash sales" r={money(r.cash_sales)} />
      {Number(r.pay_in) > 0 && <Row l="+ Pay in" r={money(r.pay_in)} />}
      {Number(r.pay_out) > 0 && <Row l="- Pay out" r={money(r.pay_out)} />}
      <Row l="Expected cash" r={money(r.expected_cash)} bold />
      {closed && (
        <>
          <Row l="Counted cash" r={money(session.counted_cash)} bold />
          <Row l={diff === 0 ? "Difference" : diff > 0 ? "Excess" : "Short"} r={money(Math.abs(diff))} bold />
        </>
      )}
      {(r.movements || []).length > 0 && (
        <>
          <hr />
          {(r.movements || []).map((m) => (
            <Row key={m.movement_id} l={`${m.type === "in" ? "In" : "Out"}: ${m.reason || ""}`} r={money(m.amount)} />
          ))}
        </>
      )}
      {(r.top_items || []).length > 0 && (
        <>
          <hr />
          <div className="bold">Top items</div>
          {r.top_items.slice(0, 8).map((it) => (
            <Row key={`${it.product_name}${it.unit}`} l={`${it.product_name} ${formatQty(it.quantity, it.unit)}`} r={money(it.amount)} />
          ))}
        </>
      )}
      {session.notes && (
        <>
          <hr />
          <div className="small">Note: {session.notes}</div>
        </>
      )}
      <hr />
      <div className="center small">Printed {formatDate(new Date().toISOString(), "short")} {formatTime(new Date().toISOString())}</div>
    </div>
  );
}
