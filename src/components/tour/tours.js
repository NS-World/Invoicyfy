/**
 * Guided demos shown from the "Demo & help" icon in the top bar.
 * A step points at an element with data-tour="<target>" (on the given route). Steps without a target are shown
 * in the middle of the screen. `optional` steps are skipped when that part is not on screen (e.g. turned off).
 */
export const TOURS = [
  {
    id: "start",
    icon: "start",
    title: "Quick tour of the app",
    text: "Where everything is: menu, internet status, language and this help.",
    steps: [
      { title: "Welcome to Invoicyfy", body: "This short tour shows how the app works. Use Next / Back, or press Esc to stop any time." },
      { target: "main-menu", title: "Main menu", body: "All screens are here — Quick Bill, Orders, Day Close, Udhaar, Coupons, Reports and Settings. On a phone open it with the ☰ button." },
      { target: "offline-status", title: "Internet status", body: "Green means connected. If the internet goes, Quick Bills are still made and printed — they are saved on this device and sent by themselves when the internet is back." },
      { target: "prefs", title: "Language & theme", body: "Switch between English, ગુજરાતી and हिन्दी, and between light and dark mode.", optional: true },
      { target: "help-tour", title: "Demo & help", body: "Open this any time for a step-by-step demo of each screen." },
      { route: "/dashboard", perm: "dashboard", target: "page-header", title: "Dashboard", body: "Today's sales, collections, dues and best sellers at a glance." },
      { title: "You are ready", body: "Pick a topic in Demo & help to learn billing, day close, udhaar, coupons, automatic messages and printing." },
    ],
  },
  {
    id: "bill",
    icon: "bill",
    perm: "invoices.add",
    title: "Make a Quick Bill",
    text: "Pick items by category, table, coupon, split payment, hold bill and print.",
    steps: [
      { route: "/invoices/new", target: "bill-customer", title: "Customer (optional)", body: "Search a saved customer by name or mobile, or just type a walk-in name. Saved customers earn loyalty points." },
      { route: "/invoices/new", target: "catalog-search", title: "Search or scan", body: "Type a product name or SKU, or scan a barcode and press Enter to add it." },
      { route: "/invoices/new", target: "catalog-tabs", title: "Category tabs", body: "Products are grouped by category. Tap a tab, then tap the item — tap again to add one more. Loose items ask grams or amount.", optional: true },
      { route: "/invoices/new", target: "catalog", title: "Item buttons", body: "Each button shows the price. The number badge shows how many are already in the bill." },
      { route: "/invoices/new", target: "table-picker", title: "Table / order type", body: "Choose Dine-in, Takeaway or Delivery. For dine-in pick the table number — it prints big on the KOT.", optional: true },
      { route: "/invoices/new", target: "bill-cart", title: "Bill items", body: "Change quantity, price, discount or add a note for the kitchen. Weight items show grams." },
      { route: "/invoices/new", target: "coupon-box", title: "Coupon & points", body: "Apply a coupon code or use the customer's loyalty points. The discount is worked out by the server so GST stays correct.", optional: true },
      { route: "/invoices/new", target: "payment-box", title: "Payment", body: "Cash, UPI, Card or Udhaar. Cash shows the change to return. UPI shows a QR code for the exact amount.", optional: true },
      { route: "/invoices/new", target: "split-btn", title: "Split payment", body: "Customer pays part cash and part UPI? Use Split to add both amounts.", optional: true },
      { route: "/invoices/new", target: "hold-btn", title: "Hold bill", body: "Customer still choosing? Hold the bill and start the next one. Held bills come back from the Held button.", optional: true },
      { route: "/invoices/new", target: "save-bill", title: "Save & print", body: "Saves the bill, prints the receipt (and KOT if on) — straight to the printer when Direct print is set up." },
      { title: "Discount limit", body: "If a discount is more than the staff member is allowed, the app asks for a manager PIN before saving. Every bill is written in the Activity Log." },
    ],
  },
  {
    id: "day",
    icon: "day",
    perm: "cash",
    title: "Day open & day close",
    text: "Count opening cash, pay in / pay out, X report and Z report.",
    steps: [
      { route: "/day-close", target: "page-header", title: "Day Close", body: "Start each day by opening the counter with the cash in the drawer, and close it at night." },
      { route: "/day-close", target: "day-open", title: "Open the day", body: "Count the notes (or type the total) and press Open day. Bills can be made after that.", optional: true },
      { route: "/day-close", target: "day-stats", title: "Live totals", body: "Cash, UPI, card, udhaar and expected cash in the drawer — updated with every bill.", optional: true },
      { route: "/day-close", target: "day-close-btn", title: "Close the day", body: "Count the cash. The app shows short / extra amount and prints the Z report. A note is needed if the difference is big.", optional: true },
      { title: "Pay in / Pay out", body: "Money taken out for milk, ice, etc. or added to the drawer is entered here so the cash matches. Old days are in the History tab." },
    ],
  },
  {
    id: "credit",
    icon: "credit",
    perm: "payments",
    title: "Udhaar / credit",
    text: "Who has to pay, since how long, receive money and send reminders.",
    steps: [
      { route: "/credit", target: "page-header", title: "Udhaar list", body: "Every customer with unpaid bills, oldest first." },
      { route: "/credit", target: "credit-stats", title: "Pending at a glance", body: "Total pending, how many customers, how much is older than 30 days and walk-in bills not paid." },
      { route: "/credit", target: "page-actions", title: "Reminders", body: "Send a polite reminder on WhatsApp, SMS or email to one customer or to all. Automatic reminders can be set in Automatic Messages." },
      { title: "Receive money", body: "Open a customer to see the statement, print it, or receive a payment — it is set against the oldest bills first." },
    ],
  },
  {
    id: "loyalty",
    icon: "loyalty",
    perm: "loyalty",
    title: "Coupons & loyalty points",
    text: "Make discount codes and reward regular customers.",
    steps: [
      { route: "/coupons", target: "page-header", title: "Coupons & Loyalty", body: "Discount codes and reward points that bring customers back." },
      { route: "/coupons", target: "coupon-add", title: "New coupon", body: "Flat ₹ or % off, minimum bill, max discount, valid dates, total uses and uses per customer.", optional: true },
      { route: "/coupons", target: "loyalty-tabs", title: "Loyalty points", body: "In the Loyalty points tab choose how many points a bill earns and what one point is worth. Points are added on every bill to a saved customer." },
      { title: "Birthday coupons", body: "With Automatic Messages on, customers get a wish with a one-time coupon on their birthday and anniversary." },
    ],
  },
  {
    id: "auto",
    icon: "auto",
    perm: "settings",
    title: "Automatic messages",
    text: "Night summary to owner, low stock alert, birthday wishes, payment reminders.",
    steps: [
      { route: "/automation", target: "page-header", title: "Automatic Messages", body: "Messages that go by themselves every day — no one has to remember." },
      { route: "/automation", target: "auto-owner", title: "Owner contacts", body: "Your mobile number(s) and email for the night sales summary and low stock alert." },
      { title: "What can be sent", body: "Night summary (sales, cash, UPI, top items), low stock list, birthday & anniversary wishes with coupon, and udhaar reminders. Choose the time and channel for each." },
      { route: "/automation", target: "page-actions", title: "Save", body: "Save the settings. Each section has a 'Send ... now' button to test it right away." },
    ],
  },
  {
    id: "print",
    icon: "print",
    title: "Direct print & offline billing",
    text: "Print without the print dialog and keep billing when the internet goes.",
    steps: [
      { route: "/counter", target: "counter-tabs", title: "Counter & Printer", body: "Counter rules (tables, open-day rule, UPI ID for QR), your approval PIN and the printer." },
      { route: "/counter", target: "printer-tab", title: "Printer tab", body: "Connect the thermal printer by USB, Bluetooth or serial cable once. After that bills and KOT print straight away — no print dialog." },
      { title: "Other printers", body: "For any other printer, start Chrome in kiosk-printing mode (steps are in the Printer tab) — Chrome then prints to the default printer without asking." },
      { target: "offline-status", title: "Offline billing", body: "No internet? Quick Bills still save and print with an OFF- number. They are sent by themselves when the internet is back and get the real bill number." },
    ],
  },
  {
    id: "pin",
    icon: "pin",
    title: "Discount limit & manager PIN",
    text: "Stop big discounts without permission and see who did what.",
    steps: [
      { title: "Discount limit per role", body: "In Roles & Permissions set 'Max discount without manager PIN (%)' for each role, e.g. Staff 5%." },
      { route: "/counter", target: "counter-tabs", title: "Manager PIN", body: "Managers set their own 4-8 digit approval PIN in the 'My approval PIN' tab. When staff give more discount, the manager types the PIN on the billing screen." },
      { route: "/activity", perm: "activity", target: "activity-important", title: "Activity Log", body: "Every bill, cancel, delete, price change, discount approval and login — who, when and from where. Turn on 'Only important' to see the risky ones." },
    ],
  },
];

export const TOUR_SEEN_KEY = "tourSeen";
