const inr = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹ 1,23,456.00 */
export const formatCurrency = (value, { symbol = true } = {}) => {
  const n = Number(value) || 0;
  return `${symbol ? "₹ " : ""}${inr.format(n)}`;
};

/** ₹1.2L style for charts and small cards */
export const formatCompact = (value) => {
  const n = Number(value) || 0;
  const a = Math.abs(n);
  const fmt = (v, unit) => `${n < 0 ? "-" : ""}₹${Number(v.toFixed(1))}${unit}`;
  if (a >= 1e7) return fmt(a / 1e7, "Cr");
  if (a >= 1e5) return fmt(a / 1e5, "L");
  if (a >= 1e3) return fmt(a / 1e3, "K");
  return `${n < 0 ? "-" : ""}₹${Math.round(a)}`;
};

export const formatNumber = (value, decimals = 2) => {
  const n = Number(value) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(decimals).replace(/\.?0+$/, "");
};

/** 2026-10-04 -> 04/10/26 (receipt) or 04 Oct 2026 */
export const formatDate = (value, style = "medium") => {
  if (!value) return "";
  const d = new Date(String(value).length <= 10 ? `${value}T00:00:00` : String(value).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return String(value);
  if (style === "short") {
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" });
  }
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const formatTime = (value) => {
  if (!value) return "";
  const d = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
};

export const today = () => toISODate(new Date());

export const toISODate = (d) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

/** Date range presets used by dashboard and reports. */
export const datePresets = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const fyStart = m >= 3 ? y : y - 1;
  return [
    { key: "today", label: "Today", from: today(), to: today() },
    { key: "7d", label: "Last 7 days", from: toISODate(new Date(y, m, now.getDate() - 6)), to: today() },
    { key: "month", label: "This month", from: toISODate(new Date(y, m, 1)), to: today() },
    { key: "lastMonth", label: "Last month", from: toISODate(new Date(y, m - 1, 1)), to: toISODate(new Date(y, m, 0)) },
    { key: "quarter", label: "This quarter", from: toISODate(new Date(y, Math.floor(m / 3) * 3, 1)), to: today() },
    { key: "fy", label: "This financial year", from: toISODate(new Date(fyStart, 3, 1)), to: today() },
  ];
};

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
  "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const twoDigits = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`);
const threeDigits = (n) => {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", rest ? twoDigits(rest) : ""].filter(Boolean).join(" ");
};

/** Indian numbering system: 1,51,000.50 -> "One Lakh Fifty One Thousand Rupees and Fifty Paise Only" */
export const amountInWords = (amount) => {
  const value = Math.abs(Number(amount) || 0);
  let rupees = Math.floor(value);
  const paise = Math.round((value - rupees) * 100);
  if (rupees === 0 && paise === 0) return "Zero Rupees Only";
  const parts = [];
  const crore = Math.floor(rupees / 10000000);
  rupees %= 10000000;
  const lakh = Math.floor(rupees / 100000);
  rupees %= 100000;
  const thousand = Math.floor(rupees / 1000);
  rupees %= 1000;
  if (crore) parts.push(`${crore > 99 ? threeDigits(crore) : twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rupees) parts.push(threeDigits(rupees));
  let words = parts.length ? `${parts.join(" ")} Rupees` : "";
  if (paise) words += `${words ? " and " : ""}${twoDigits(paise)} Paise`;
  return `${words} Only`;
};

/** Pull a human readable message out of an axios error. */
export const apiError = (err, fallback = "Something went wrong. Please try again.") =>
  err?.response?.data?.message || (err?.message === "Network Error" ? "Cannot reach the server. Check your internet connection." : err?.message) || fallback;

/** Download rows as CSV (opens in Excel). */
export const downloadCsv = (filename, columns, rows) => {
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map((c) => esc(c.label)).join(",")];
  rows.forEach((r) => lines.push(columns.map((c) => esc(typeof c.value === "function" ? c.value(r) : r[c.key])).join(",")));
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
