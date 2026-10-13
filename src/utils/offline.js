/**
 * Offline billing. When the internet is down, a Quick Bill is saved on this device (IndexedDB "outbox")
 * with a client_uuid, printed with a provisional number, and sent to the server automatically when the
 * connection is back. The server saves each client_uuid once, so retries can never create duplicates.
 * The product list is also kept on the device so items can be picked offline.
 */
import { InvoiceServices } from "../services/InvoiceServices";
import { apiError } from "./format";

const DB = "invoicyfy-offline";
const VERSION = 1;
export const OUTBOX_EVENT = "invoicyfy-outbox";

let dbPromise = null;
function db() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser cannot store bills offline"));
      return;
    }
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains("outbox")) d.createObjectStore("outbox", { keyPath: "client_uuid" });
      if (!d.objectStoreNames.contains("cache")) d.createObjectStore("cache");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch((e) => {
    dbPromise = null;
    throw e;
  });
  return dbPromise;
}

function tx(store, mode, fn) {
  return db().then(
    (d) =>
      new Promise((resolve, reject) => {
        const t = d.transaction(store, mode);
        const s = t.objectStore(store);
        const out = fn(s);
        t.oncomplete = () => resolve(out?.result !== undefined ? out.result : out);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

const notify = () => window.dispatchEvent(new CustomEvent(OUTBOX_EVENT));

/* ---------------------------------------------------------------- cache (products, categories...) */

export const cacheSet = (key, value) => tx("cache", "readwrite", (s) => s.put({ value, at: Date.now() }, key)).catch(() => {});
export const cacheGet = (key) =>
  tx("cache", "readonly", (s) => s.get(key))
    .then((r) => r?.value ?? null)
    .catch(() => null);

/* ---------------------------------------------------------------- outbox */

/** A request failed because there is no connection (not because the server refused it). */
export const isNetworkError = (e) => !e?.response && (e?.code === "ERR_NETWORK" || e?.code === "ECONNABORTED" || e?.message === "Network Error" || !navigator.onLine);

export async function queueBill(payload, preview) {
  const row = {
    client_uuid: payload.client_uuid,
    payload: { ...payload, offline_created_at: payload.offline_created_at || localDateTime() },
    preview,
    created_at: Date.now(),
    status: "pending",
    error: null,
    attempts: 0,
  };
  await tx("outbox", "readwrite", (s) => s.put(row));
  notify();
  return row;
}

export const listOutbox = () =>
  tx("outbox", "readonly", (s) => s.getAll())
    .then((rows) => (rows || []).sort((a, b) => a.created_at - b.created_at))
    .catch(() => []);

export async function removeFromOutbox(uuid) {
  await tx("outbox", "readwrite", (s) => s.delete(uuid));
  notify();
}

async function update(row) {
  await tx("outbox", "readwrite", (s) => s.put(row));
}

let syncing = null;
/**
 * Send waiting bills, oldest first. Stops at the first network error (still offline).
 * Bills the server refuses (e.g. a deleted product) stay with status "error" so someone can look at them.
 * Returns { sent: [{client_uuid, invoice_number}], failed, pending }.
 */
export function syncOutbox() {
  if (syncing) return syncing;
  syncing = (async () => {
    const sent = [];
    let failed = 0;
    const rows = await listOutbox();
    for (const row of rows) {
      if (row.status === "error") {
        failed++;
        continue;
      }
      try {
        const res = await InvoiceServices.createInvoice(row.payload);
        await removeFromOutbox(row.client_uuid);
        sent.push({ client_uuid: row.client_uuid, invoice_number: res.invoice_number, invoice_id: res.invoice_id, provisional: row.preview?.invoice_number });
      } catch (e) {
        if (isNetworkError(e) || e?.response?.status >= 500 || e?.response?.status === 401) {
          await update({ ...row, attempts: row.attempts + 1 });
          break;
        }
        failed++;
        await update({ ...row, status: "error", error: apiError(e), attempts: row.attempts + 1 });
      }
    }
    notify();
    const left = await listOutbox();
    return { sent, failed, pending: left.length };
  })().finally(() => {
    syncing = null;
  });
  return syncing;
}

/** Put a refused bill back in the queue (after fixing the cause on the server, e.g. re-adding a product). */
export async function retryOutbox(uuid) {
  const rows = await listOutbox();
  const row = rows.find((r) => r.client_uuid === uuid);
  if (row) await update({ ...row, status: "pending", error: null });
  notify();
}

/** "2026-10-13 18:42:05" in the device's local time (the server stores local shop time too). */
export function localDateTime(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Short provisional number printed on offline receipts, e.g. OFF-1013-4F2A. */
export const provisionalNumber = (uuid) => {
  const d = new Date();
  return `OFF-${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${uuid.replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase()}`;
};
