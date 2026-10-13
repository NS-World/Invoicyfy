import { formatDate } from "./format";

export const DEFAULT_REMINDER = "Hello {name}, a payment of ₹{due} is pending at {shop} for {bills} bill(s). Please pay at your convenience. Thank you!";

const waNumber = (p) => {
  const d = String(p || "").replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
};

export const reminderText = (row, shop, template = DEFAULT_REMINDER) =>
  template
    .replaceAll("{name}", row.name || "Customer")
    .replaceAll("{due}", Number(row.due).toFixed(2))
    .replaceAll("{bills}", row.bills ?? "")
    .replaceAll("{shop}", shop || "our shop")
    .replaceAll("{oldest}", row.oldest ? formatDate(row.oldest) : "");

/** api.whatsapp.com keeps emojis intact (wa.me breaks them on WhatsApp Desktop). */
export const waReminderLink = (row, shop) => `https://api.whatsapp.com/send?phone=${waNumber(row.phone)}&text=${encodeURIComponent(reminderText(row, shop))}`;
